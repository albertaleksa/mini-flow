export type Priority = "low" | "medium" | "high" | null;
export type TemplateId = "default" | "software" | "weekly";

export interface Member {
  id: string;
  displayName: string;
  joinedAt: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  position: number;
  isDone: boolean;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  assigneeId: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  shareId: string;
  name: string;
  template: TemplateId;
  createdAt: string;
  columns: BoardColumn[];
  tasks: Task[];
  members: Member[];
}

export interface TaskFields {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  assigneeId: string | null;
}

export const TEMPLATES: Record<
  TemplateId,
  { label: string; columns: string[]; description: string }
> = {
  default: {
    label: "Personal tasks",
    columns: ["To Do", "In Progress", "Done"],
    description: "A clean slate for anything on your mind.",
  },
  software: {
    label: "Software project",
    columns: ["Backlog", "To Do", "In Progress", "Review", "Done"],
    description: "From first idea to final review.",
  },
  weekly: {
    label: "Weekly planning",
    columns: ["Planned", "This Week", "In Progress", "Done"],
    description: "Give the week a little structure.",
  },
};
