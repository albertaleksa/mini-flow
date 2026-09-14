from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException

TEMPLATES = {
    'default': ['To Do', 'In Progress', 'Done'],
    'software': ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
    'weekly': ['Planned', 'This Week', 'In Progress', 'Done'],
}


def now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def uid():
    return uuid4().hex


class Store:
    def __init__(self):
        self.boards = {}
        self.users = {}
        self.tokens = {}
        self.memberships = {}
        self.created = {}
        self.listeners = {}
        demo = self.create_board('Demo Board', 'default', None, 'demo')
        col = demo['columns'][0]['id']
        self.add_task(demo, col, {'title': 'Welcome to MiniFlow', 'description': 'Move this task across the board.', 'priority': 'medium', 'dueDate': None, 'assigneeId': None})

    def create_board(self, name, template, user, share_id=None):
        board = {'id': uid(), 'shareId': share_id or uid()[:12], 'name': name, 'template': template, 'createdAt': now(), 'columns': [], 'tasks': [], 'members': []}
        for pos, label in enumerate(TEMPLATES[template]):
            board['columns'].append({'id': uid(), 'name': label, 'position': pos, 'isDone': label == 'Done'})
        self.boards[board['id']] = board
        if user:
            self.created.setdefault(user, set()).add(board['id'])
        return board

    def board(self, board_id):
        board = self.boards.get(board_id)
        if not board:
            raise HTTPException(404, 'Board not found')
        return board

    def item(self, board, kind, item_id):
        result = next((x for x in board[kind] if x['id'] == item_id), None)
        if not result:
            raise HTTPException(404, f'{kind[:-1].capitalize()} not found')
        return result

    def member(self, board, user):
        mid = self.memberships.get((board['id'], user))
        return next((m for m in board['members'] if m['id'] == mid), None)

    def require_member(self, board, user):
        if not self.member(board, user):
            raise HTTPException(401, 'Board membership required')

    def normalize(self, board):
        for pos, column in enumerate(board['columns']):
            column['position'] = pos
            for index, task in enumerate(t for t in board['tasks'] if t['columnId'] == column['id']):
                task['position'] = index

    def add_task(self, board, column_id, fields):
        col = self.item(board, 'columns', column_id)
        timestamp = now()
        task = {**fields, 'id': uid(), 'columnId': column_id, 'position': sum(t['columnId'] == column_id for t in board['tasks']), 'completedAt': timestamp if col['isDone'] else None, 'createdAt': timestamp, 'updatedAt': timestamp}
        board['tasks'].append(task)
        return task

    def emit(self, board_id):
        for queue in list(self.listeners.get(board_id, [])):
            queue.put_nowait({'type': 'board.changed'})
