from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select

from app.database import Board, Column, Member, Task, Token, User

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
    def __init__(self, sessions):
        self.sessions = sessions
        self.listeners = {}  # WebSocket connections remain local to this process.
        with self.sessions() as session:
            demo_exists = session.scalar(select(Board.id).where(Board.share_id == 'demo'))
        if not demo_exists:
            demo = self.create_board('Demo Board', 'default', None, 'demo')
            self.add_task(demo, demo['columns'][0]['id'], {
                'title': 'Welcome to MiniFlow', 'description': 'Move this task across the board.',
                'priority': 'medium', 'dueDate': None, 'assigneeId': None,
            })
            self.save_board(demo)

    def register(self, username, password_hash):
        with self.sessions.begin() as session:
            if session.get(User, username):
                raise HTTPException(409, 'Username already exists')
            session.add(User(username=username, password_hash=password_hash))

    def password_hash(self, username):
        with self.sessions() as session:
            user = session.get(User, username)
            return user.password_hash if user else None

    def add_token(self, value, username):
        with self.sessions.begin() as session:
            session.add(Token(value=value, username=username))

    def token_user(self, value):
        with self.sessions() as session:
            token = session.get(Token, value)
            return token.username if token else None

    def create_board(self, name, template, user, share_id=None):
        board = {
            'id': uid(), 'shareId': share_id or uid()[:12], 'name': name,
            'template': template, 'createdAt': now(), 'columns': [], 'tasks': [], 'members': [],
        }
        for pos, label in enumerate(TEMPLATES[template]):
            board['columns'].append({'id': uid(), 'name': label, 'position': pos, 'isDone': label == 'Done'})
        self.save_board(board, created_by=user)
        return board

    def _snapshot(self, session, row):
        columns = session.scalars(select(Column).where(Column.board_id == row.id).order_by(Column.position, Column.id)).all()
        tasks = session.scalars(select(Task).join(Column, Task.column_id == Column.id)
                                .where(Task.board_id == row.id)
                                .order_by(Column.position, Task.position, Task.id)).all()
        members = session.scalars(select(Member).where(Member.board_id == row.id).order_by(Member.joined_at, Member.id)).all()
        return {
            'id': row.id, 'shareId': row.share_id, 'name': row.name,
            'template': row.template, 'createdAt': row.created_at,
            'columns': [{'id': c.id, 'name': c.name, 'position': c.position, 'isDone': c.is_done} for c in columns],
            'tasks': [{
                'id': t.id, 'columnId': t.column_id, 'title': t.title,
                'description': t.description, 'priority': t.priority, 'dueDate': t.due_date,
                'assigneeId': t.assignee_id, 'position': t.position,
                'completedAt': t.completed_at, 'createdAt': t.created_at, 'updatedAt': t.updated_at,
            } for t in tasks],
            'members': [{'id': m.id, 'displayName': m.display_name, 'joinedAt': m.joined_at} for m in members],
        }

    def board(self, board_id):
        with self.sessions() as session:
            row = session.get(Board, board_id)
            if not row:
                raise HTTPException(404, 'Board not found')
            return self._snapshot(session, row)

    def by_share(self, share_id):
        with self.sessions() as session:
            row = session.scalar(select(Board).where(Board.share_id == share_id))
            if not row:
                raise HTTPException(404, 'Board not found')
            return self._snapshot(session, row)

    def list_boards(self, username):
        with self.sessions() as session:
            rows = session.scalars(
                select(Board).where(
                    (Board.created_by == username) |
                    Board.id.in_(select(Member.board_id).where(Member.username == username))
                ).order_by(Board.created_at, Board.id)
            ).all()
            return [self._snapshot(session, row) for row in rows]

    def member(self, board, user):
        if not user:
            return None
        with self.sessions() as session:
            row = session.scalar(select(Member).where(Member.board_id == board['id'], Member.username == user))
            return {'id': row.id, 'displayName': row.display_name, 'joinedAt': row.joined_at} if row else None

    def join(self, board, user, display_name):
        with self.sessions.begin() as session:
            row = session.scalar(select(Member).where(Member.board_id == board['id'], Member.username == user))
            if row:
                row.display_name = display_name
            else:
                row = Member(id=uid(), board_id=board['id'], username=user, display_name=display_name, joined_at=now())
                session.add(row)
            return {'id': row.id, 'displayName': row.display_name, 'joinedAt': row.joined_at}

    def require_member(self, board, user):
        if not self.member(board, user):
            raise HTTPException(401, 'Board membership required')

    def save_board(self, board, created_by=None):
        with self.sessions.begin() as session:
            row = session.get(Board, board['id'])
            if row is None:
                session.add(Board(id=board['id'], share_id=board['shareId'], name=board['name'],
                                  template=board['template'], created_at=board['createdAt'], created_by=created_by))
                session.flush()
            else:
                row.name = board['name']

            existing_tasks = {t.id: t for t in session.scalars(select(Task).where(Task.board_id == board['id']))}
            existing_columns = {c.id: c for c in session.scalars(select(Column).where(Column.board_id == board['id']))}
            task_ids = {t['id'] for t in board['tasks']}
            column_ids = {c['id'] for c in board['columns']}
            for task_id, task in existing_tasks.items():
                if task_id not in task_ids:
                    session.delete(task)
            session.flush()
            for col in board['columns']:
                row_col = existing_columns.get(col['id']) or Column(id=col['id'], board_id=board['id'])
                row_col.name, row_col.position, row_col.is_done = col['name'], col['position'], col['isDone']
                session.add(row_col)
            session.flush()
            for task in board['tasks']:
                row_task = existing_tasks.get(task['id']) or Task(id=task['id'], board_id=board['id'])
                for attribute, key in (
                    ('column_id', 'columnId'), ('title', 'title'), ('description', 'description'),
                    ('priority', 'priority'), ('due_date', 'dueDate'), ('assignee_id', 'assigneeId'),
                    ('position', 'position'), ('completed_at', 'completedAt'),
                    ('created_at', 'createdAt'), ('updated_at', 'updatedAt'),
                ):
                    setattr(row_task, attribute, task[key])
                session.add(row_task)
            session.flush()
            for column_id, column in existing_columns.items():
                if column_id not in column_ids:
                    session.delete(column)

    def item(self, board, kind, item_id):
        result = next((x for x in board[kind] if x['id'] == item_id), None)
        if not result:
            raise HTTPException(404, f'{kind[:-1].capitalize()} not found')
        return result

    def normalize(self, board):
        for pos, column in enumerate(board['columns']):
            column['position'] = pos
            for index, task in enumerate(t for t in board['tasks'] if t['columnId'] == column['id']):
                task['position'] = index

    def add_task(self, board, column_id, fields):
        col = self.item(board, 'columns', column_id)
        timestamp = now()
        task = {**fields, 'id': uid(), 'columnId': column_id,
                'position': sum(t['columnId'] == column_id for t in board['tasks']),
                'completedAt': timestamp if col['isDone'] else None,
                'createdAt': timestamp, 'updatedAt': timestamp}
        board['tasks'].append(task)
        return task

    def emit(self, board_id):
        for queue in list(self.listeners.get(board_id, [])):
            queue.put_nowait({'type': 'board.changed'})
