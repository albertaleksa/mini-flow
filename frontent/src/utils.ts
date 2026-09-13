import type { Priority, Task } from "./types";

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysUntil(date: string, today = dateKey()): number {
  return Math.round(
    (Date.parse(`${date}T12:00:00`) - Date.parse(`${today}T12:00:00`)) /
      86_400_000,
  );
}

export function dueLabel(task: Task): string | null {
  if (!task.dueDate) return null;
  const remaining = daysUntil(task.dueDate);
  if (remaining < 0 && !task.completedAt)
    return `${Math.abs(remaining)}d overdue`;
  if (remaining === 0) return "Today";
  if (remaining === 1) return "Tomorrow";
  return new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function matchesTask(
  task: Task,
  filters: {
    search: string;
    priority: Priority | "all";
    due: string;
    assignee: string;
  },
  today = dateKey(),
): boolean {
  if (
    !task.title
      .toLocaleLowerCase()
      .includes(filters.search.trim().toLocaleLowerCase())
  )
    return false;
  if (filters.priority !== "all" && task.priority !== filters.priority)
    return false;
  if (
    filters.assignee !== "all" &&
    (filters.assignee === "unassigned"
      ? task.assigneeId !== null
      : task.assigneeId !== filters.assignee)
  )
    return false;
  if (
    filters.due === "overdue" &&
    (!task.dueDate || task.dueDate >= today || task.completedAt)
  )
    return false;
  if (
    filters.due === "soon" &&
    (!task.dueDate ||
      task.completedAt ||
      daysUntil(task.dueDate, today) < 0 ||
      daysUntil(task.dueDate, today) > 7)
  )
    return false;
  return true;
}
