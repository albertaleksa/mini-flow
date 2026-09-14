# MiniFlow

**A desktop-first Kanban workspace for individuals and small teams.** MiniFlow puts tasks, priorities, due dates, and teammates on shareable boards, so work does not get lost across separate lists and messages. It combines a React board interface with a FastAPI backend and a persistent SQLite database.

## What it does

Start with a blank, software-project, or weekly-planning template, or explore the seeded **Demo Board**. Add and reorder columns, create tasks, assign them to board members, and drag work toward the designated Done column. MiniFlow records when a task enters Done and clears that timestamp if it leaves. Search and filters help find tasks by title, priority, due status, or assignee.

Each board has a share link. Anyone with the link can read it; a person enters a display name to join before editing. Members have equal permissions. The browser creates its own credential automatically, so there is no account-management screen. Board updates use HTTP writes followed by WebSocket change notices; clients reload the board after each notice or reconnection and poll every three seconds if the socket is unavailable.

## How well does it work?

| Area | Current evidence |
| --- | --- |
| Behavior | 6 backend API tests cover authentication, task and column changes, notifications, SQLite restart persistence, and database configuration. 20 frontend tests cover UI flows, services, ordering, filters, and drop positions. |
| Build | The frontend passes its TypeScript check and production Vite build. |
| Performance | No load test or latency benchmark has been run. The project is aimed at personal work and small teams; throughput is not quantified. |
| Monitoring | Uvicorn provides request and error logs. There are no application metrics, traces, alerts, or monitoring dashboard. Client polling is a connection fallback, not a monitoring system. |

Run the checks yourself:

```bash
make test
cd frontent
npm test
npm run build
```

These are API, component, service, and utility tests. There is not yet an automated real-browser test for dragging a task across columns or a load test. No CI/CD pipeline is configured, so these checks are run locally.

## Quickstart

You need Python 3.11+, [uv](https://docs.astral.sh/uv/), [Node.js](https://nodejs.org/) 20.19+ (20.x) or 22.12+, npm, and `make`. The Node range follows the installed Vite version.

From the repository root, start the backend:

```bash
make install
make run
```

In another terminal, start the frontend:

```bash
cd frontent
npm ci
npm run dev
```

Open the URL printed by Vite. It proxies `/api` HTTP and WebSocket traffic to the backend at `127.0.0.1:8000`. The Demo Board is ready on first launch. To check the API directly, open `http://127.0.0.1:8000/docs` or run:

```bash
curl http://127.0.0.1:8000/api/boards/by-share/demo
```

### Data and configuration

The default database is `backend/miniflow.db`. Alembic runs schema migrations when the backend starts and seeds the Demo Board once. Boards, memberships, credentials, and bearer tokens survive a restart. Use `MINIFLOW_DATABASE_URL` to select a different SQLAlchemy database URL:

```bash
MINIFLOW_DATABASE_URL=sqlite:///./local.db make run
```

In that example, `local.db` is created in `backend/` because `make run` starts the server there. The database file is ignored by Git; keep backups of any data you need. Other database engines need their SQLAlchemy driver and migration/query testing before use.

The browser stores its bearer token, last-used display name, and board-list ordering in `localStorage`. Board data and membership live in the database. Another browser or device receives a different identity, even if its user chooses the same display name.

### Deployment

`npm run build` produces static frontend files in `frontent/dist/`. Serve those files with a host that routes board URLs such as `/board/<shareId>` back to `index.html`, and proxy `/api` (including WebSocket upgrades) to the FastAPI server. Use HTTPS for the browser-facing site and a persistent, writable database location.

Run **one backend worker**: WebSocket subscribers are stored in that process, so multiple workers would not deliver every board change to every connected viewer. The repository has no deployment manifest or automated release pipeline. See the [Vite static deployment guide](https://vite.dev/guide/static-deploy) and [FastAPI deployment concepts](https://fastapi.tiangolo.com/deployment/concepts/) when designing a deployment; the Vite preview command is for local preview, not production hosting.

## How it is built

`frontent/src/services/boardService.ts` defines the UI data-access contract. The running app uses `ApiBoardService` for HTTP and WebSocket access; `MockBoardService` remains for isolated tests. FastAPI routers validate requests and authorize writes. SQLAlchemy stores boards, columns, tasks, memberships, credentials, and tokens, while Alembic manages schema changes. The server emits a board-change notice only after a write commits; the frontend then fetches a fresh board snapshot.

| Path | Purpose |
| --- | --- |
| `frontent/src/App.tsx` | React board and workspace UI |
| `frontent/src/services/` | API client, service contract, mock, and browser-local board ordering |
| `backend/app/routers/` | Authentication, board, column, and task endpoints |
| `backend/app/database.py`, `backend/app/store.py` | SQLAlchemy models and data access |
| `backend/alembic/` | Database migrations |
| `backend/tests/`, `frontent/src/**/*.test.*` | Automated tests |
| `openapi.yaml`, `_docs/specs.md` | API contract and detailed product behavior |

The design keeps board-list order local to each browser, while shared board content lives on the server. SQLite makes local setup simple and durable; the SQLAlchemy URL keeps the data layer open to another database, but PostgreSQL has not been validated.

## Scope and next steps

MiniFlow covers boards, columns, tasks, assignment, ordering, search, filters, templates, sharing, and board updates. It does **not** provide user-managed accounts, password recovery, private share-link reads, roles, conflict resolution, comments, reminders, or cross-device identity. Share links grant public read access, and all joined members can edit.

The most useful next checks are a real-browser drag-and-reload test, full WebSocket integration testing, and measured performance under expected load. Before wider deployment, add observability, automated CI, backup procedures, and a shared notification mechanism if multiple backend workers are needed. The core workflow and restart persistence are tested; production-scale reliability remains unproven.
