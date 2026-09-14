import asyncio
from fastapi import APIRouter, Depends, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from app.auth import require_user, user_from_header
from app.models import CreateBoard, JoinBoard

router = APIRouter(prefix='/boards', tags=['Boards'])


@router.get('')
async def list_boards(request: Request, authorization: str | None = Header(default=None)):
    user = user_from_header(request, authorization)
    if not user:
        return []
    store = request.app.state.store
    return store.list_boards(user)


@router.post('', status_code=201)
async def create_board(body: CreateBoard, request: Request, authorization: str | None = Header(default=None)):
    return request.app.state.store.create_board(body.name, body.template, user_from_header(request, authorization))


@router.get('/by-share/{shareId}')
async def by_share(shareId: str, request: Request):
    return request.app.state.store.by_share(shareId)


@router.get('/{boardId}/viewer')
async def viewer(boardId: str, request: Request, authorization: str | None = Header(default=None)):
    store = request.app.state.store
    board = store.board(boardId)
    user = user_from_header(request, authorization)
    return store.member(board, user) if user else None


@router.post('/{boardId}/members')
async def join(boardId: str, body: JoinBoard, request: Request, user: str = Depends(require_user)):
    store = request.app.state.store
    board = store.board(boardId)
    member = store.join(board, user, body.displayName)
    store.emit(boardId)
    return member


@router.websocket('/{boardId}/events')
async def events(websocket: WebSocket, boardId: str):
    store = websocket.app.state.store
    try:
        store.board(boardId)
    except HTTPException:
        await websocket.close(code=4404)
        return
    await websocket.accept()
    queue = asyncio.Queue()
    store.listeners.setdefault(boardId, []).append(queue)
    try:
        while True:
            receive_task = asyncio.create_task(websocket.receive())
            event_task = asyncio.create_task(queue.get())
            done, pending = await asyncio.wait({receive_task, event_task}, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
            if receive_task in done and receive_task.result()['type'] == 'websocket.disconnect':
                break
            if event_task in done:
                await websocket.send_json(event_task.result())
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        store.listeners[boardId].remove(queue)
