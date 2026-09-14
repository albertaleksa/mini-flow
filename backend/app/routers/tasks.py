from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth import require_user
from app.models import MoveTask, TaskFields
from app.store import now
from app.routers.columns import access

router = APIRouter(prefix='/boards/{boardId}', tags=['Tasks'])


def fields_for_board(store, board, body):
    fields = body.model_dump(mode='json')
    if fields['assigneeId'] and not any(m['id'] == fields['assigneeId'] for m in board['members']):
        raise HTTPException(422, 'Assignee is not a board member')
    return fields


@router.post('/columns/{columnId}/tasks', status_code=201)
async def add_task(boardId: str, columnId: str, body: TaskFields, request: Request, user: str = Depends(require_user)):
    store, board = access(request, boardId, user)
    store.item(board, 'columns', columnId)
    task = store.add_task(board, columnId, fields_for_board(store, board, body))
    store.save_board(board)
    store.emit(boardId)
    return task


@router.put('/tasks/{taskId}', status_code=204)
async def update_task(boardId: str, taskId: str, body: TaskFields, request: Request, user: str = Depends(require_user)):
    store, board = access(request, boardId, user)
    task = store.item(board, 'tasks', taskId)
    task.update(fields_for_board(store, board, body))
    task['updatedAt'] = now()
    store.save_board(board)
    store.emit(boardId)


@router.delete('/tasks/{taskId}', status_code=204)
async def delete_task(boardId: str, taskId: str, request: Request, user: str = Depends(require_user)):
    store, board = access(request, boardId, user)
    board['tasks'].remove(store.item(board, 'tasks', taskId))
    store.normalize(board)
    store.save_board(board)
    store.emit(boardId)


@router.put('/tasks/{taskId}/position', status_code=204)
async def move_task(boardId: str, taskId: str, body: MoveTask, request: Request, user: str = Depends(require_user)):
    store, board = access(request, boardId, user)
    task = store.item(board, 'tasks', taskId)
    destination = store.item(board, 'columns', body.toColumnId)
    board['tasks'].remove(task)
    destination_tasks = sorted((t for t in board['tasks'] if t['columnId'] == body.toColumnId), key=lambda t: t['position'])
    index = min(body.toIndex, len(destination_tasks))
    if destination_tasks:
        insert_at = board['tasks'].index(destination_tasks[index]) if index < len(destination_tasks) else board['tasks'].index(destination_tasks[-1]) + 1
    else:
        insert_at = len(board['tasks'])
    previous_column = task['columnId']
    task['columnId'] = body.toColumnId
    if previous_column != body.toColumnId:
        task['completedAt'] = now() if destination['isDone'] else None
    task['updatedAt'] = now()
    board['tasks'].insert(insert_at, task)
    store.normalize(board)
    store.save_board(board)
    store.emit(boardId)
