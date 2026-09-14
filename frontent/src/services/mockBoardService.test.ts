import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockBoardService } from "./mockBoardService";

const fields = {
  title: "Ship the board",
  description: "A useful task",
  priority: "high" as const,
  dueDate: null,
  assigneeId: null,
};

describe("MockBoardService", () => {
  beforeEach(() => window.localStorage.clear());

  it("creates a template board, remembers membership, and persists edits", async () => {
    const service = new MockBoardService();
    const board = await service.createBoard("Sprint plan", "weekly");
    expect(board.columns.map((column) => column.name)).toEqual([
      "Planned",
      "This Week",
      "In Progress",
      "Done",
    ]);

    const member = await service.joinBoard(board.id, "Alex");
    const task = await service.addTask(board.id, board.columns[0].id, {
      ...fields,
      assigneeId: member.id,
    });
    await service.updateTask(board.id, task.id, {
      ...fields,
      title: "Ship MiniFlow",
      assigneeId: member.id,
    });

    const reloaded = new MockBoardService();
    expect((await reloaded.getViewer(board.id))?.displayName).toBe("Alex");
    expect(
      (await reloaded.getBoardByShareId(board.shareId))?.tasks[0],
    ).toMatchObject({ title: "Ship MiniFlow", assigneeId: member.id });
  });

  it("keeps manual and name-sorted board order across service instances", async () => {
    const service = new MockBoardService();
    const zulu = await service.createBoard("Zulu", "default");
    const alpha = await service.createBoard("Alpha", "default");
    const original = await service.listBoards();
    await service.moveBoard(alpha.id, 0);
    expect((await service.listBoards())[0].id).toBe(alpha.id);
    await service.sortBoardsByName();
    expect((await new MockBoardService().listBoards()).map((board) => board.name)).toEqual([
      "Alpha", "Website redesign", "Zulu",
    ]);
    await service.moveBoard(zulu.id, 0);
    expect((await new MockBoardService().listBoards()).map((board) => board.id)).toEqual([
      zulu.id, alpha.id, original[0].id,
    ]);
  });

  it("reorders tasks and sets or clears completion when they cross the Done column", async () => {
    const service = new MockBoardService();
    const board = await service.createBoard("Delivery", "default");
    const todo = board.columns[0].id;
    const done = board.columns[2].id;
    const first = await service.addTask(board.id, todo, fields);
    const second = await service.addTask(board.id, todo, {
      ...fields,
      title: "Second task",
    });

    await service.moveTask(board.id, second.id, todo, 0);
    let current = (await service.getBoardByShareId(board.shareId))!;
    expect(
      current.tasks
        .filter((task) => task.columnId === todo)
        .sort((a, b) => a.position - b.position)
        .map((task) => task.id),
    ).toEqual([second.id, first.id]);

    await service.moveTask(board.id, first.id, done, 0);
    current = (await service.getBoardByShareId(board.shareId))!;
    expect(
      current.tasks.find((task) => task.id === first.id)?.completedAt,
    ).not.toBeNull();
    await service.moveTask(board.id, first.id, todo, 1);
    current = (await service.getBoardByShareId(board.shareId))!;
    expect(
      current.tasks.find((task) => task.id === first.id)?.completedAt,
    ).toBeNull();
  });

  it("moves tasks when deleting a column and notifies subscribers", async () => {
    const service = new MockBoardService();
    const board = await service.createBoard("Ops", "default");
    const task = await service.addTask(board.id, board.columns[1].id, fields);
    const listener = vi.fn();
    const unsubscribe = service.subscribe(board.id, listener);

    await service.deleteColumn(board.id, board.columns[1].id);
    expect(listener).toHaveBeenCalledTimes(1);
    const current = (await service.getBoardByShareId(board.shareId))!;
    expect(current.columns).toHaveLength(2);
    expect(current.tasks.find((item) => item.id === task.id)?.columnId).toBe(
      board.columns[0].id,
    );
    unsubscribe();
  });
});
