# MiniFlow agent guide

## Product and scope

- Read `_docs/specs.md` before changing product behavior. It defines the desktop-first, multi-user Kanban MVP and the chosen technology stack.
- Keep the MVP focused on boards, customizable columns, tasks, assignment, drag-and-drop ordering, search, filters, templates, and real-time board updates. Accounts, roles, comments, notifications, analytics, and mobile-specific interaction are outside the MVP.
- People join a board with a display name and shareable link. Board members have equal permissions. A task is complete in the designated Done column; moving it out clears `completedAt`.

## Repository layout

- `frontent/` is the intentional directory name for the React/TypeScript/Vite app. Do not silently rename it.
- `frontent/src/services/boardService.ts` defines the data-access contract. `mockBoardService.ts` implements it with `localStorage`, and `services/index.ts` selects the implementation. Keep all board data access behind this service layer; UI components should not call a backend or read/write storage directly.
- The mock supports persistence and updates across tabs in one browser profile. It cannot share data across devices. Keep that limitation clear until the FastAPI backend exists.
- No backend has been implemented yet. The planned backend is Python/FastAPI with SQLAlchemy, Alembic, and SQLite; normal writes use HTTP and board updates use WebSockets.

## Working on the frontend

From `frontent/`:

```bash
npm ci
npm run dev
npm test
npm run build
```

- Add tests for meaningful user behavior and service invariants when changing them. Existing tests use Vitest and React Testing Library.
- Keep task and column positions consistent after moves or deletion. Treat a drag operation as one saved update; refresh board state after reconnecting to a future backend.
- Preserve the existing component styles and desktop-first layout unless the task calls for a redesign.
- Do not commit `node_modules/`, `dist/`, or other generated files.

## Working on the future backend

Use `uv` for Python dependency management when the backend is added. Useful commands:

```bash
uv sync
uv add <PACKAGE-NAME>
uv run python <PYTHON-FILE>
```

Keep database access through SQLAlchemy and schema changes in Alembic migrations. SQLite is the initial persistent database; test database-specific behavior before any later move to PostgreSQL.

Make small, coherent Git commits regularly. Include tests and documentation updates with the behavior they describe.
