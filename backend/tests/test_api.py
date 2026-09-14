import asyncio

import httpx
import pytest
from app.main import create_app

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return 'asyncio'


def client(database_url='sqlite://'):
    app = create_app(database_url)
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test')


async def login(c, username='alice', password='secret123'):
    assert (await c.post('/api/auth/register', json={'username': username, 'password': password})).status_code == 201
    token = (await c.post('/api/auth/token', json={'username': username, 'password': password})).json()['access_token']
    return {'Authorization': f'Bearer {token}'}


async def test_seed_and_auth():
    async with client() as c:
        board = (await c.get('/api/boards/by-share/demo')).json()
        assert board['columns'] and board['tasks']
        assert (await c.get('/api/boards')).json() == []
        headers = await login(c)
        assert (await c.post(f"/api/boards/{board['id']}/columns", json={'name': 'Review'})).status_code == 401
        assert (await c.post(f"/api/boards/{board['id']}/members", json={'displayName': 'Alice'}, headers=headers)).status_code == 200
        assert (await c.post(f"/api/boards/{board['id']}/columns", json={'name': 'Review'}, headers=headers)).status_code == 201
        assert len((await c.get('/api/boards', headers=headers)).json()) == 1
        assert (await c.post('/api/auth/token', json={'username': 'alice', 'password': 'wrong'})).status_code == 401


async def test_board_task_lifecycle():
    async with client() as c:
        h = await login(c)
        board = (await c.post('/api/boards', json={'name': 'Test', 'template': 'default'}, headers=h)).json()
        bid = board['id']
        assert (await c.post(f'/api/boards/{bid}/members', json={'displayName': 'Alice'}, headers=h)).status_code == 200
        todo, _, done = [col['id'] for col in board['columns']]
        fields = {'title': 'Task', 'description': '', 'priority': None, 'dueDate': None, 'assigneeId': None}
        task = (await c.post(f'/api/boards/{bid}/columns/{todo}/tasks', json=fields, headers=h)).json()
        assert task['position'] == 0
        assert (await c.put(f"/api/boards/{bid}/tasks/{task['id']}/position", json={'toColumnId': done, 'toIndex': 0}, headers=h)).status_code == 204
        current = (await c.get(f"/api/boards/by-share/{board['shareId']}")).json()['tasks'][0]
        assert current['completedAt']
        assert (await c.put(f"/api/boards/{bid}/tasks/{task['id']}/position", json={'toColumnId': todo, 'toIndex': 0}, headers=h)).status_code == 204
        assert (await c.get(f"/api/boards/by-share/{board['shareId']}")).json()['tasks'][0]['completedAt'] is None
        assert (await c.delete(f"/api/boards/{bid}/tasks/{task['id']}", headers=h)).status_code == 204


async def test_change_emitted_after_commit():
    app = create_app('sqlite://')
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as c:
        h = await login(c)
        board = (await c.post('/api/boards', json={'name': 'Live', 'template': 'weekly'}, headers=h)).json()
        bid = board['id']
        queue = asyncio.Queue()
        app.state.store.listeners[bid] = [queue]
        await c.post(f'/api/boards/{bid}/members', json={'displayName': 'Alice'}, headers=h)
        assert await queue.get() == {'type': 'board.changed'}
        assert len((await c.get(f'/api/boards/by-share/{board["shareId"]}')).json()['members']) == 1


async def test_columns_assignment_and_positions():
    async with client() as c:
        h = await login(c)
        b = (await c.post('/api/boards', json={'name': 'Ordering', 'template': 'default'}, headers=h)).json()
        bid = b['id']
        member = (await c.post(f'/api/boards/{bid}/members', json={'displayName': 'Alice'}, headers=h)).json()
        todo, progress, done = [col['id'] for col in b['columns']]
        task_fields = {'title': 'One', 'description': '', 'priority': 'high', 'dueDate': None, 'assigneeId': member['id']}
        first = (await c.post(f'/api/boards/{bid}/columns/{todo}/tasks', json=task_fields, headers=h)).json()
        second = (await c.post(f'/api/boards/{bid}/columns/{todo}/tasks', json={**task_fields, 'title': 'Two'}, headers=h)).json()
        assert (await c.put(f"/api/boards/{bid}/tasks/{second['id']}/position", json={'toColumnId': todo, 'toIndex': 0}, headers=h)).status_code == 204
        assert (await c.patch(f'/api/boards/{bid}/columns/{progress}', json={'name': 'Doing'}, headers=h)).status_code == 204
        assert (await c.put(f'/api/boards/{bid}/columns/{done}/position', json={'toIndex': 0}, headers=h)).status_code == 204
        assert (await c.delete(f'/api/boards/{bid}/columns/{todo}', headers=h)).status_code == 204
        state = (await c.get(f"/api/boards/by-share/{b['shareId']}")).json()
        assert [col['position'] for col in state['columns']] == [0, 1]
        assert [t['position'] for t in state['tasks']] == [0, 1]
        assert [t['id'] for t in state['tasks']] == [second['id'], first['id']]
        assert all(t['completedAt'] for t in state['tasks'])
        assert (await c.post(f'/api/boards/{bid}/columns/{progress}/tasks', json={**task_fields, 'assigneeId': 'unknown'}, headers=h)).status_code == 422


async def test_sqlite_restart_retains_identity_and_board(tmp_path):
    url = f'sqlite:///{tmp_path / "boards.db"}'
    async with client(url) as c:
        h = await login(c)
        board = (await c.post('/api/boards', json={'name': 'Persistent', 'template': 'default'}, headers=h)).json()
        member = (await c.post(f'/api/boards/{board["id"]}/members', json={'displayName': 'Alice'}, headers=h)).json()
        todo = board['columns'][0]['id']
        fields = {'title': 'Saved', 'description': '', 'priority': 'high', 'dueDate': None, 'assigneeId': member['id']}
        task = (await c.post(f'/api/boards/{board["id"]}/columns/{todo}/tasks', json=fields, headers=h)).json()
    async with client(url) as c:
        assert (await c.get(f'/api/boards/{board["id"]}/viewer', headers=h)).json()['id'] == member['id']
        assert [b['id'] for b in (await c.get('/api/boards', headers=h)).json()] == [board['id']]
        state = (await c.get(f'/api/boards/by-share/{board["shareId"]}')).json()
        assert state['tasks'][0]['id'] == task['id']
        assert state['tasks'][0]['assigneeId'] == member['id']
        assert len((await c.get('/api/boards/by-share/demo')).json()['tasks']) == 1


async def test_database_url_environment_variable(tmp_path, monkeypatch):
    database = tmp_path / 'configured.db'
    monkeypatch.setenv('MINIFLOW_DATABASE_URL', f'sqlite:///{database}')
    app = create_app()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as c:
        assert (await c.get('/api/boards/by-share/demo')).status_code == 200
    assert database.exists()
