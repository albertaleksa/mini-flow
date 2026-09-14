import type { BoardService } from "./boardService";
import { boardSortDirection, moveBoard, orderBoards, sortBoardsByName } from "./boardOrder";
import type { Board, BoardColumn, Member, Task, TaskFields, TemplateId } from "../types";

const TOKEN_KEY = "miniflow:api-token:v1";
const NAME_KEY = "miniflow:display-name:v1";
const api = "/api";

/** HTTP writes and WebSocket invalidations for the in-memory FastAPI server. */
export class ApiBoardService implements BoardService {
  private token: string | null = window.localStorage.getItem(TOKEN_KEY);
  private identityPromise: Promise<string> | null = null;

  private async identity(): Promise<string> {
    if (this.token) return this.token;
    if (!this.identityPromise) {
      this.identityPromise = (async () => {
        const credentials = {
          username: `browser-${crypto.randomUUID()}`,
          password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
        };
        const registered = await fetch(`${api}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        if (!registered.ok) throw await this.error(registered);
        const response = await fetch(`${api}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        if (!response.ok) throw await this.error(response);
        const { access_token } = (await response.json()) as { access_token: string };
        this.token = access_token;
        window.localStorage.setItem(TOKEN_KEY, access_token);
        return access_token;
      })().finally(() => { this.identityPromise = null; });
    }
    return this.identityPromise;
  }

  private async error(response: Response): Promise<Error> {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    return new Error(body?.detail || `Request failed (${response.status}).`);
  }

  private async request<T>(path: string, method = "GET", body?: unknown, authenticate = false, retried = false): Promise<T> {
    const token = authenticate ? await this.identity() : this.token;
    const response = await fetch(`${api}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 401 && authenticate && !retried && token === this.token) {
      this.token = null;
      window.localStorage.removeItem(TOKEN_KEY);
      return this.request<T>(path, method, body, authenticate, true);
    }
    if (!response.ok) throw await this.error(response);
    return response.status === 204 ? undefined as T : await response.json() as T;
  }

  async listBoards(): Promise<Board[]> {
    const boards = await this.request<Board[]>("/boards");
    const demo = await this.getBoardByShareId("demo");
    return orderBoards(demo && !boards.some((board) => board.id === demo.id) ? [demo, ...boards] : boards, window.localStorage);
  }
  async moveBoard(boardId: string, toIndex: number): Promise<void> {
    moveBoard(await this.listBoards(), boardId, toIndex, window.localStorage);
  }
  getBoardSortDirection(): "asc" | "desc" | null {
    return boardSortDirection(window.localStorage);
  }
  async sortBoardsByName(): Promise<void> {
    sortBoardsByName(await this.listBoards(), window.localStorage);
  }
  async getBoardByShareId(shareId: string): Promise<Board | null> {
    const response = await fetch(`${api}/boards/by-share/${encodeURIComponent(shareId)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw await this.error(response);
    return response.json() as Promise<Board>;
  }
  createBoard(name: string, template: TemplateId): Promise<Board> {
    return this.request("/boards", "POST", { name: name.trim(), template }, true);
  }
  getPreferredDisplayName(): string | null {
    return window.localStorage.getItem(NAME_KEY);
  }
  getViewer(boardId: string): Promise<Member | null> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/viewer`);
  }
  async joinBoard(boardId: string, displayName: string): Promise<Member> {
    const member = await this.request<Member>(`/boards/${encodeURIComponent(boardId)}/members`, "POST", { displayName: displayName.trim() }, true);
    window.localStorage.setItem(NAME_KEY, member.displayName);
    return member;
  }
  addColumn(boardId: string, name: string): Promise<BoardColumn> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/columns`, "POST", { name: name.trim() }, true);
  }
  renameColumn(boardId: string, columnId: string, name: string): Promise<void> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/columns/${encodeURIComponent(columnId)}`, "PATCH", { name: name.trim() }, true);
  }
  deleteColumn(boardId: string, columnId: string): Promise<void> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/columns/${encodeURIComponent(columnId)}`, "DELETE", undefined, true);
  }
  moveColumn(boardId: string, columnId: string, toIndex: number): Promise<void> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/columns/${encodeURIComponent(columnId)}/position`, "PUT", { toIndex }, true);
  }
  addTask(boardId: string, columnId: string, fields: TaskFields): Promise<Task> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/columns/${encodeURIComponent(columnId)}/tasks`, "POST", { ...fields, title: fields.title.trim() }, true);
  }
  updateTask(boardId: string, taskId: string, fields: TaskFields): Promise<void> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/tasks/${encodeURIComponent(taskId)}`, "PUT", { ...fields, title: fields.title.trim() }, true);
  }
  deleteTask(boardId: string, taskId: string): Promise<void> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/tasks/${encodeURIComponent(taskId)}`, "DELETE", undefined, true);
  }
  moveTask(boardId: string, taskId: string, toColumnId: string, toIndex: number): Promise<void> {
    return this.request(`/boards/${encodeURIComponent(boardId)}/tasks/${encodeURIComponent(taskId)}/position`, "PUT", { toColumnId, toIndex }, true);
  }
  subscribe(boardId: string, onChange: () => void): () => void {
    let closed = false;
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    let poll: number | undefined;
    const stopPolling = () => {
      window.clearInterval(poll);
      poll = undefined;
    };
    const startPolling = () => {
      if (poll === undefined) poll = window.setInterval(onChange, 3000);
    };
    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      try {
        socket = new WebSocket(`${protocol}//${window.location.host}${api}/boards/${encodeURIComponent(boardId)}/events`);
      } catch {
        startPolling();
        retry = window.setTimeout(connect, 3000);
        return;
      }
      socket.onopen = () => {
        stopPolling();
        onChange(); // Re-fetch anything changed before the socket connected.
      };
      socket.onmessage = (event) => {
        try {
          if (JSON.parse(event.data as string)?.type === "board.changed") onChange();
        } catch { /* Ignore unknown event frames. */ }
      };
      socket.onclose = () => {
        if (closed) return;
        startPolling();
        retry = window.setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      stopPolling();
      socket?.close();
    };
  }
}
