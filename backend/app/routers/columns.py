from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth import require_user
from app.models import ColumnName, MoveColumn
from app.store import now, uid

router = APIRouter(prefix='/boards/{boardId}/columns', tags=['Columns'])


def access(request, boardId, user):
    store = request.app.state.store
    board = store.board(boardId)
    store.require_member(board, user)
    return store, board


@router.post('', status_code=201)
async def add_column(boardId: str, body: ColumnName, request: Request, user: str = Depends(require_user)):
    store, board = access(request, boardId, user)
    col = {'id': uid(), 'name': body.name, 'position': len(board['columns']), 'isDone': body.name.lower() == 'done' and not any(c['isDone'] for c in board['columns'])}
    board['columns'].append(col)
    store.emit(boardId)
    return col


@router.patch('/{columnId}', status_code=204)
async def rename_column(boardId: str, columnId: str, body: ColumnName, request: Request, user: str = Depends(require_user)):
    store, board = access(request, boardId, user)
    col = store.item(board, 'columns', columnId)
    col['name'] = body.name
    if body.name.lower() == 'done' and not any(c['isDone'] for c in board['columns']):
        col['isDone'] = True
        for task in board['tasks']:
            if task['columnId'] == columnId and not task['completedAt']:
                task['completedAt'] = now()
    store.emit(boardId)


@router.delete('/{columnId}', status_code=204)
async def delete_column(boardId: str, columnId: str, request: Request, user: str = Depends(require_user)):
    store, board = access(request, boardId, user)
    col = store.item(board, 'columns', columnId)
    if len(board['columns']) == 1:
        raise HTTPException(409, 'Cannot delete last column')
    board['columns'].remove(col)
    destination = board['columns'][0]
    displaced = sorted((t for t in board['tasks'] if t['columnId'] == columnId), key=lambda t: t['position'])
    board['tasks'] = [t for t in board['tasks'] if t['columnId'] != columnId] + displaced
    for task in displaced:
        task['columnId'] = destination['id']
        task['completedAt'] = now() if destination['isDone'] else None
        task['updatedAt'] = now()
    store.normalize(board)
    store.emit(boardId)


@router.put('/{columnId}/position', status_code=204)
async def move_column(boardId: str, columnId: str, body: MoveColumn, request: Request, user: str = Depends(require_user)):
    store, board = access(request, boardId, user)
    col = store.item(board, 'columns', columnId)
    board['columns'].remove(col)
    board['columns'].insert(min(body.toIndex, len(board['columns'])), col)
    store.normalize(board)
    store.emit(boardId)
