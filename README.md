# mini-flow

MiniFlow is a desktop-first Kanban app. Run `make install` and `make run` for the backend, then `cd frontent && npm ci && npm run dev` for the frontend. Run `make test` for backend tests.

The backend stores boards and browser credentials in SQLite at `backend/miniflow.db` by default. Set `MINIFLOW_DATABASE_URL` to a SQLAlchemy database URL to choose a different database. Schema migrations run on startup; WebSocket notifications still require a single backend worker.
