import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiBoardService } from "./apiBoardService";

const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
}) as Response;

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("ApiBoardService", () => {
  it("uses a browser token to join and edit a board", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ username: "browser" }, 201))
      .mockResolvedValueOnce(response({ access_token: "token-1" }))
      .mockResolvedValueOnce(response({ id: "member-1", displayName: "Alex", joinedAt: "today" }))
      .mockResolvedValueOnce(response({ id: "column-1", name: "Review", position: 3, isDone: false }, 201));
    vi.stubGlobal("fetch", fetcher);
    const service = new ApiBoardService();
    await service.joinBoard("board-1", "Alex");
    await service.addColumn("board-1", "Review");
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls[2][0]).toBe("/api/boards/board-1/members");
    expect(fetcher.mock.calls[3][1].headers.Authorization).toBe("Bearer token-1");
  });

  it("maps a missing share link to null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ detail: "Not found" }, 404)));
    expect(await new ApiBoardService().getBoardByShareId("missing")).toBeNull();
  });

  it("replaces an expired token and retries a protected request once", async () => {
    window.localStorage.setItem("miniflow:api-token:v1", "expired");
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ detail: "Authentication required" }, 401))
      .mockResolvedValueOnce(response({ username: "browser" }, 201))
      .mockResolvedValueOnce(response({ access_token: "new-token" }))
      .mockResolvedValueOnce(response({ id: "member-1", displayName: "Alex", joinedAt: "today" }));
    vi.stubGlobal("fetch", fetcher);
    await new ApiBoardService().joinBoard("board-1", "Alex");
    expect(fetcher.mock.calls[3][1].headers.Authorization).toBe("Bearer new-token");
  });
});

describe("board updates", () => {
  it("polls while the socket is unavailable and refreshes on reconnect", () => {
    vi.useFakeTimers();
    const sockets: Array<{ onopen: (() => void) | null; onclose: (() => void) | null; onmessage: ((event: MessageEvent) => void) | null; close: () => void }> = [];
    class FakeSocket {
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      close = vi.fn();
      constructor() { sockets.push(this); }
    }
    vi.stubGlobal("WebSocket", FakeSocket);
    const changed = vi.fn();
    const unsubscribe = new ApiBoardService().subscribe("board-1", changed);
    sockets[0].onclose?.();
    vi.advanceTimersByTime(3000);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(2);
    sockets[1].onopen?.();
    expect(changed).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(3000);
    expect(changed).toHaveBeenCalledTimes(2);
    sockets[1].onmessage?.({ data: '{"type":"board.changed"}' } as MessageEvent);
    expect(changed).toHaveBeenCalledTimes(3);
    unsubscribe();
    vi.useRealTimers();
  });
});
