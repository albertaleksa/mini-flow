# MiniFlow: current product and implementation

MiniFlow is a desktop-first Kanban app for personal work and small teams. This document describes the behavior implemented as of 2026-09-14.

## User experience

- The home page lists boards and offers default, software-project, and weekly-planning templates. A seeded **Demo Board** is included by the backend.
- Each board has a share link, customizable columns, tasks, and a member list. Share the link directly; there are no email invitations. Anyone with the link can read the board. A person joins with a display name before editing.
- A browser can join several boards. Membership and display name are board-specific. The frontend remembers the most recently used name, pre-fills it when joining another board, and uses it when the same browser creates a new board. Changing a name on one board does not rename memberships on other boards.
- All board members have equal edit permissions. There are no owners, roles, or invitation approvals. Click the member count to see members; tasks can be assigned to one member of the same board or left unassigned.
- Columns can be added, renamed, deleted, and dragged to reorder. A board must retain at least one column. Deleting a column moves its tasks to the first remaining column.
- Tasks have a required title and optional description, priority (low, medium, high), due date, and assignee. They can be created, edited, deleted, dragged between columns, and reordered. Column and task positions are zero-based and contiguous after moves and deletion.
- One column per board can be designated Done. Entering it sets `completedAt`; leaving it clears `completedAt`. Reordering within Done preserves the timestamp.
- Search by task title and filters for priority, due status, and assignee run in the frontend against the current board. Overdue tasks are marked visually; no reminders or automatic changes occur.
- The **Your boards** list can be dragged into a manual order or sorted A–Z/Z–A by repeatedly clicking the sort control. A focused board entry can move with Up/Down. This board-list order is a local browser preference and also controls the workspace menu and overview; it does not change another person's list.

## Data, identity, and collaboration

The frontend in `frontent/` uses `ApiBoardService` for all board data access. It creates a random browser credential through the backend's register/token endpoints, saves the opaque bearer token in `localStorage`, and sends it on protected requests. The backend hashes passwords with salted PBKDF2-SHA256. There is no visible account-management UI, password recovery, or cross-device identity. A browser on another device is a different identity even if the same display name is entered. The old `MockBoardService` remains for isolated tests and local demonstrations; it is not selected by the running frontend.

The FastAPI backend in `backend/` stores boards, columns, tasks, members, credentials, and tokens in a SQLAlchemy database. SQLite at `backend/miniflow.db` is the default; `MINIFLOW_DATABASE_URL` selects another SQLAlchemy database URL. Alembic migrations run on startup. Restarting the backend retains data and tokens. WebSocket subscribers remain in process memory, so use a single worker for notifications.

Normal writes use HTTP. After a member, column, or task change commits, the backend sends a `{"type":"board.changed"}` WebSocket frame to subscribers of that board. The frontend fetches the full board after a frame and after reconnecting. If WebSockets are unavailable, it polls the board every three seconds and retries the connection. Concurrent writes are last-write-wins; there is no conflict-resolution UI.

Public reads use a board's share ID. Board creation is public, but associating it with the current browser requires a valid bearer token; the frontend supplies one. Joining and all column/task writes require a valid token, and writes require membership on that board. The same browser can join multiple boards. The browser's board list contains boards it created or joined, plus the frontend's pinned Demo Board.

## Repository and local development

- `frontent/` is intentionally spelled that way. React, TypeScript, Vite, `@dnd-kit/react`, and Vitest power the UI.
- `frontent/src/services/boardService.ts` is the UI data-access contract. `apiBoardService.ts` implements HTTP/WebSocket access; `boardOrder.ts` stores the browser's board-list preference; `mockBoardService.ts` is the local mock.
- `backend/app/` contains FastAPI routers, Pydantic request models, a SQLAlchemy data layer, and authentication. `backend/alembic/` contains schema migrations. `backend/pyproject.toml` and `uv.lock` manage Python dependencies. `openapi.yaml` documents the implemented HTTP and WebSocket contract.
- Start the backend from the repository root with `make install` and `make run`. In another terminal, run `cd frontent && npm ci && npm run dev`. Vite proxies `/api` and board WebSockets to `http://127.0.0.1:8000`.
- Run `make test` for backend tests; run `npm test` and `npm run build` from `frontent/` for frontend checks.

## Persistence and deployment

The Demo Board is seeded once into a new database. Normal reads and writes use SQLAlchemy, and each HTTP write commits before broadcasting a board-change notification. Board-list ordering remains a browser-local preference. SQLite is the tested database; another SQLAlchemy URL needs its driver and database-specific migration/query testing before deployment. Keep one backend worker until notifications use a shared transport.

## Current limits

One backend worker is supported for WebSocket notifications; share links grant public read access, and bearer tokens live in browser storage and the database. The app has no user-managed accounts, email invitations, roles, comments, notifications, analytics, or touch-specific workflow. Stronger identity and deployment controls remain future work.
