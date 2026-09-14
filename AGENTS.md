# MiniFlow agent guide

Read `_docs/specs.md` before changing product behavior. It describes the implemented desktop-first Kanban app. Keep work focused on boards, columns, tasks, assignment, ordering, search, filters, templates, sharing, and board updates. Do not silently rename the intentional `frontent/` directory.

## Current architecture

- `frontent/src/services/boardService.ts` is the UI data-access contract. `services/index.ts` selects `ApiBoardService`; UI components must use the service layer rather than call HTTP or browser storage directly. `MockBoardService` is retained for isolated tests.
- `apiBoardService.ts` uses `/api` HTTP endpoints and board WebSockets. Vite proxies `/api` to the local FastAPI server. On a failed WebSocket, the client polls every three seconds and retries. `boardOrder.ts` stores each browser's board-list order and A–Z/Z–A mode locally.
- `backend/app/` contains routers, Pydantic request models, authentication, and a SQLAlchemy data layer. SQLite at `backend/miniflow.db` is the default; `MINIFLOW_DATABASE_URL` selects another SQLAlchemy database URL. Alembic migrations run on startup. Boards, members, credentials, and tokens survive restarts. WebSocket subscribers remain process-local, so use one backend worker until notifications use a shared transport.
- The browser obtains a bearer token using an automatically generated credential. Share-link reads are public. Joining requires a token; editing requires token plus membership. Display names and memberships are per board, and all members have equal permissions. The UI has no account-management screen.
- Tasks and columns have contiguous zero-based positions. A task's `completedAt` is set in the designated Done column and cleared when it leaves. Keep drag DOM placement under React's control, treat a drag as one saved update on drop, and reload board state after WebSocket reconnects.

## Checks and commands

From the repository root, use `make install`, `make run`, and `make test` for the backend. Use `uv` for Python dependency changes. From `frontent/`, use `npm ci`, `npm run dev`, `npm test`, and `npm run build`. Add meaningful tests when changing user behavior or service invariants. Keep generated files such as `node_modules/`, `dist/`, `.venv/`, and caches out of commits.

Keep `_docs/specs.md`, `openapi.yaml`, and READMEs consistent with behavior. Make small, coherent commits regularly with related tests and documentation. SQLite persistence exists; do not claim cross-device identity, tested support for other databases, or real-time delivery across multiple backend workers until those features exist.
