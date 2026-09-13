import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import { matchesTask } from "./utils";

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
