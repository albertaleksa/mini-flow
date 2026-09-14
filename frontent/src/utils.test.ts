import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import { matchesTask, taskDropIndex } from "./utils";

const task: Task = {
  id: "one",
  columnId: "todo",
  title: "Review design",
  description: "",
  priority: "high",
  dueDate: "2026-09-12",
  assigneeId: "alex",
  position: 0,
  completedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

describe("task filters", () => {
  it("combines search, priority, due status, and assignee", () => {
    const filters = {
      search: "DESIGN",
      priority: "high" as const,
      due: "overdue",
      assignee: "alex",
    };
    expect(matchesTask(task, filters, "2026-09-13")).toBe(true);
    expect(
      matchesTask({ ...task, assigneeId: null }, filters, "2026-09-13"),
    ).toBe(false);
    expect(
      matchesTask(
        { ...task, completedAt: "2026-09-12T10:00:00Z" },
        filters,
        "2026-09-13",
      ),
    ).toBe(false);
  });
});

describe("task drop positions", () => {
  it("inserts before or after a task in another column", () => {
    const target = { ...task, id: "target", columnId: "done", position: 1 };
    expect(taskDropIndex(task, target, false)).toBe(1);
    expect(taskDropIndex(task, target, true)).toBe(2);
  });

  it("accounts for removal of the source within the same column", () => {
    const target = { ...task, id: "target", position: 2 };
    expect(taskDropIndex(task, target, false)).toBe(1);
    expect(taskDropIndex(task, target, true)).toBe(2);
  });
});
