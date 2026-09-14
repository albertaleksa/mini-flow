# MiniFlow frontend

Start the backend and frontend in separate terminals from the repository root:

```bash
make install
make run
```

```bash
cd frontent
npm ci
npm run dev
```

Open the URL printed by Vite. The frontend uses the FastAPI backend through Vite's `/api` proxy, including board WebSockets. If a WebSocket cannot connect, the client refreshes board state every three seconds and retries the connection. The backend's seeded **Demo Board** appears on the home page. Enter a display name to join it; create boards from the home page and share board links across browsers. The backend stores data in memory, so boards, memberships, and tasks reset when it restarts.

The frontend creates a random browser credential to obtain a bearer token for protected backend requests. It stores the token in this browser's `localStorage` and creates a new credential if the backend restarts and invalidates the token. This keeps the existing display-name join flow; it is not a user account or a cross-device identity.

```bash
npm test
npm run build
```

Board data access remains behind `src/services/boardService.ts`; `src/services/apiBoardService.ts` implements the real API client. The old mock remains for its isolated tests.

Each board has its own share link and member list. Send the link to a person to invite them; the same person can join multiple boards. Display names belong to board memberships, so they may differ by board. The browser remembers the last name used, pre-fills it when joining another shared board, and automatically uses it when creating another board. Click the member count on a board to see everyone who has joined. There are no email invitations or roles in this MVP.

The **Your boards** list can be arranged by dragging a board, pressing Up/Down while its sidebar entry is focused, or pressing the name-sort control to alternate between **A–Z** and **Z–A**. The chosen order also appears in the workspace menu and home overview. This is a preference saved in the current browser; other people can arrange their own lists independently.
