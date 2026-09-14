from fastapi.testclient import TestClient
from app.main import create_app


def client():
    return TestClient(create_app())


def login(c, username='alice', password='secret123'):
    assert c.post('/api/auth/register', json={'username': username, 'password': password}).status_code == 201
    token = c.post('/api/auth/token', json={'username': username, 'password': password}).json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def test_seed_and_auth():
    with client() as c:
        board = c.get('/api/boards/by-share/demo').json()
        assert board['columns'] and board['tasks']
        assert c.get('/api/boards').json() == []
        headers = login(c)
        assert c.post(f"/api/boards/{board['id']}/columns", json={'name': 'Review'}).status_code == 401
        assert c.post(f"/api/boards/{board['id']}/members", json={'displayName': 'Alice'}, headers=headers).status_code == 200
        assert c.post(f"/api/boards/{board['id']}/columns", json={'name': 'Review'}, headers=headers).status_code == 201
        assert len(c.get('/api/boards', headers=headers).json()) == 1
        assert c.post('/api/auth/token', json={'username': 'alice', 'password': 'wrong'}).status_code == 401


def test_board_task_lifecycle():
    with client() as c:
        h = login(c)
        board = c.post('/api/boards', json={'name': 'Test', 'template': 'default'}, headers=h).json()
        bid = board['id']
        assert c.post(f'/api/boards/{bid}/members', json={'displayName': 'Alice'}, headers=h).status_code == 200
        todo, _, done = [col['id'] for col in board['columns']]
        fields = {'title': 'Task', 'description': '', 'priority': None, 'dueDate': None, 'assigneeId': None}
        task = c.post(f'/api/boards/{bid}/columns/{todo}/tasks', json=fields, headers=h).json()
        assert task['position'] == 0
        assert c.put(f"/api/boards/{bid}/tasks/{task['id']}/position", json={'toColumnId': done, 'toIndex': 0}, headers=h).status_code == 204
        current = c.get(f"/api/boards/by-share/{board['shareId']}").json()['tasks'][0]
        assert current['completedAt']
        assert c.put(f"/api/boards/{bid}/tasks/{task['id']}/position", json={'toColumnId': todo, 'toIndex': 0}, headers=h).status_code == 204
        assert c.get(f"/api/boards/by-share/{board['shareId']}").json()['tasks'][0]['completedAt'] is None
        assert c.delete(f"/api/boards/{bid}/tasks/{task['id']}", headers=h).status_code == 204


def test_websocket_change():
    with client() as c:
        h = login(c)
        board = c.post('/api/boards', json={'name': 'Live', 'template': 'weekly'}, headers=h).json()
        bid = board['id']
        with c.websocket_connect(f'/api/boards/{bid}/events') as ws:
            c.post(f'/api/boards/{bid}/members', json={'displayName': 'Alice'}, headers=h)
            assert ws.receive_json() == {'type': 'board.changed'}


def test_columns_assignment_and_positions():
    with client() as c:
        h = login(c)
        b = c.post('/api/boards', json={'name': 'Ordering', 'template': 'default'}, headers=h).json()
        bid = b['id']
        member = c.post(f'/api/boards/{bid}/members', json={'displayName': 'Alice'}, headers=h).json()
        todo, progress, done = [col['id'] for col in b['columns']]
        task_fields = {'title': 'One', 'description': '', 'priority': 'high', 'dueDate': None, 'assigneeId': member['id']}
        first = c.post(f'/api/boards/{bid}/columns/{todo}/tasks', json=task_fields, headers=h).json()
        second = c.post(f'/api/boards/{bid}/columns/{todo}/tasks', json={**task_fields, 'title': 'Two'}, headers=h).json()
        assert c.put(f"/api/boards/{bid}/tasks/{second['id']}/position", json={'toColumnId': todo, 'toIndex': 0}, headers=h).status_code == 204
        assert c.patch(f'/api/boards/{bid}/columns/{progress}', json={'name': 'Doing'}, headers=h).status_code == 204
        assert c.put(f'/api/boards/{bid}/columns/{done}/position', json={'toIndex': 0}, headers=h).status_code == 204
        assert c.delete(f'/api/boards/{bid}/columns/{todo}', headers=h).status_code == 204
        state = c.get(f"/api/boards/by-share/{b['shareId']}").json()
        assert [col['position'] for col in state['columns']] == [0, 1]
        assert [t['position'] for t in state['tasks']] == [0, 1]
        assert [t['id'] for t in state['tasks']] == [second['id'], first['id']]
        assert all(t['completedAt'] for t in state['tasks'])
        assert c.post(f'/api/boards/{bid}/columns/{progress}/tasks', json={**task_fields, 'assigneeId': 'unknown'}, headers=h).status_code == 422
