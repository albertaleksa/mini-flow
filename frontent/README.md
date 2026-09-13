# MiniFlow frontend

The frontend runs with a local mock service. Boards, members, tasks, and ordering are stored in this browser's `localStorage`; changes in another tab of the same browser profile appear automatically. Sharing across browsers or devices will require the future FastAPI backend.

```bash
cd frontent
npm install
npm run dev
```

Open the URL printed by Vite. The sample **Website redesign** board gives you tasks to try. Enter a display name when joining. You can create boards from templates, add and edit tasks, drag tasks and columns, search and filter, and copy board links.

```bash
npm test
npm run build
```

All data operations are defined by `src/services/boardService.ts` and implemented by `src/services/mockBoardService.ts`. Replace the export in `src/services/index.ts` with a FastAPI-backed implementation when the backend is ready.
