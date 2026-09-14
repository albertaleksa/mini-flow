# MiniFlow backend

Run `uv sync`, then `uv run uvicorn app.main:app --reload` from this directory. Run tests with `uv run pytest`.

The API is mounted at `/api`. A demo board is available at `GET /api/boards/by-share/demo`. Data, accounts, memberships, and bearer tokens live in memory and reset when the process restarts; use one server worker. Register with `POST /api/auth/register` and obtain a token with `POST /api/auth/token`, each accepting `{"username":"...","password":"..."}`. Send `Authorization: Bearer <access_token>` when joining a board or editing it. After joining, all members have equal edit permissions. Public board reads and board WebSocket events require no token.

The implemented HTTP and WebSocket contract is documented in `../openapi.yaml`. The frontend calls this API through the Vite development proxy.
