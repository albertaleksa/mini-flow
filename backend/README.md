# MiniFlow backend

Run `uv sync`, then `uv run uvicorn app.main:app --reload` from this directory. Run tests with `uv run pytest`.

The server uses SQLite by default at `backend/miniflow.db`. Set `MINIFLOW_DATABASE_URL` to a SQLAlchemy database URL to choose another database, for example `sqlite:////absolute/path/boards.db`. Schema migrations run automatically on startup through Alembic. For a non-SQLite database, install its SQLAlchemy driver and test the migrations and queries against that database before deployment. Keep the database file out of version control and back it up as needed.

The API is mounted at `/api`. A demo board is seeded once at `GET /api/boards/by-share/demo`. Boards, accounts, memberships, and bearer tokens survive restarts. Use one server worker: WebSocket notifications remain local to each process. Register with `POST /api/auth/register` and obtain a token with `POST /api/auth/token`, each accepting `{"username":"...","password":"..."}`. Send `Authorization: Bearer <access_token>` when joining a board or editing it. After joining, all members have equal edit permissions. Public board reads and board WebSocket events require no token.

The implemented HTTP and WebSocket contract is documented in `../openapi.yaml`. The frontend calls this API through the Vite development proxy.
