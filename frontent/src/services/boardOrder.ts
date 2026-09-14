import type { Board } from "../types";

const ORDER_KEY = "miniflow:board-order:v1";

function savedIds(storage: Storage): string[] {
  try {
    const ids: unknown = JSON.parse(storage.getItem(ORDER_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function orderBoards(boards: Board[], storage: Storage): Board[] {
  const rank = new Map(savedIds(storage).map((id, index) => [id, index]));
  return [...boards].sort((a, b) =>
    (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity),
  );
}

export function moveBoard(boards: Board[], boardId: string, toIndex: number, storage: Storage): void {
  const ordered = orderBoards(boards, storage);
  const from = ordered.findIndex((board) => board.id === boardId);
  if (from < 0) return;
  const [board] = ordered.splice(from, 1);
  ordered.splice(Math.max(0, Math.min(toIndex, ordered.length)), 0, board);
  storage.setItem(ORDER_KEY, JSON.stringify(ordered.map((item) => item.id)));
}

export function sortBoardsByName(boards: Board[], storage: Storage): void {
  const sorted = [...boards].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  storage.setItem(ORDER_KEY, JSON.stringify(sorted.map((board) => board.id)));
}
