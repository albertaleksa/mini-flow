import type { BoardService } from "./boardService";
import type {
  Board,
  BoardColumn,
  Member,
  Task,
  TaskFields,
  TemplateId,
} from "../types";
import { TEMPLATES } from "../types";
import { dateKey } from "../utils";

const DATA_KEY = "miniflow:boards:v1";
const VIEWER_KEY = "miniflow:viewers:v1";

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const dayFromNow = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return dateKey(date);
};

function seedBoards(): Board[] {
  const createdAt = now();
  const columns: BoardColumn[] = TEMPLATES.software.columns.map(
    (name, position) => ({
      id: `demo-column-${position}`,
      name,
      position,
      isDone: name === "Done",
    }),
  );
  const members: Member[] = [
    { id: "demo-ava", displayName: "Ava Chen", joinedAt: createdAt },
    { id: "demo-noah", displayName: "Noah Wilson", joinedAt: createdAt },
    { id: "demo-mia", displayName: "Mia Patel", joinedAt: createdAt },
  ];
  const examples: Array<
    [number, string, string, Task["priority"], number | null, string | null]
  > = [
    [
      0,
      "Explore visual directions",
      "Collect references and settle on a visual direction for the new site.",
      "medium",
      5,
      "demo-ava",
    ],
    [
      0,
      "Map out key pages",
      "Outline the content and structure of each page.",
      "low",
      null,
      "demo-noah",
    ],
    [
      1,
      "Write homepage copy",
      "Keep the message clear and concise.",
      "high",
      2,
      "demo-mia",
    ],
    [
      1,
      "Review navigation structure",
      "Make sure people can find what they need.",
      "medium",
      4,
      "demo-ava",
    ],
    [
      2,
      "Build landing page",
      "Implement the first responsive page layout.",
      "high",
      1,
      "demo-noah",
    ],
    [
      2,
      "Create component library",
      "Buttons, inputs, cards and shared layout elements.",
      "medium",
      7,
      "demo-ava",
    ],
    [
      3,
      "Check accessibility",
      "Review focus states, contrast and keyboard navigation.",
      "medium",
      -1,
      "demo-mia",
    ],
    [
      4,
      "Project kickoff",
      "Align on goals, timing and responsibilities.",
      "low",
      null,
      "demo-ava",
    ],
  ];
  const tasks: Task[] = examples.map(
    (
      [columnIndex, title, description, priority, dueIn, assigneeId],
      index,
    ) => ({
      id: `demo-task-${index}`,
      columnId: columns[columnIndex].id,
      title,
      description,
      priority,
      dueDate: dueIn === null ? null : dayFromNow(dueIn),
      assigneeId,
      position: examples
        .slice(0, index)
        .filter(([group]) => group === columnIndex).length,
      completedAt: columnIndex === 4 ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    }),
  );
  return [
    {
      id: "demo-board",
      shareId: "demo-board",
      name: "Website redesign",
      template: "software",
      createdAt,
      columns,
      tasks,
      members,
    },
  ];
}

/** LocalStorage-backed demo. Cross-tab storage events emulate board subscriptions. */
export class MockBoardService implements BoardService {
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(private readonly storage: Storage = window.localStorage) {
    if (!this.storage.getItem(DATA_KEY))
      this.storage.setItem(DATA_KEY, JSON.stringify(seedBoards()));
    window.addEventListener("storage", (event) => {
      if (event.key === DATA_KEY) this.emitAll();
    });
  }

  private read(): Board[] {
    try {
      return JSON.parse(this.storage.getItem(DATA_KEY) || "[]") as Board[];
    } catch {
      return [];
    }
  }

  private write(boards: Board[], boardId?: string) {
    this.storage.setItem(DATA_KEY, JSON.stringify(boards));
    if (boardId) this.emit(boardId);
  }

  private emit(boardId: string) {
    this.listeners.get(boardId)?.forEach((listener) => listener());
  }

  private emitAll() {
    this.listeners.forEach((listeners) =>
      listeners.forEach((listener) => listener()),
    );
  }

  private mutate<T>(boardId: string, change: (board: Board) => T): T {
    const boards = this.read();
    const board = boards.find((item) => item.id === boardId);
    if (!board) throw new Error("Board not found.");
    const result = change(board);
    this.write(boards, boardId);
    return result;
  }

  private viewers(): Record<string, string> {
    try {
      return JSON.parse(this.storage.getItem(VIEWER_KEY) || "{}") as Record<
        string,
        string
      >;
    } catch {
      return {};
    }
  }

  async listBoards(): Promise<Board[]> {
    return this.read();
  }

  async getBoardByShareId(shareId: string): Promise<Board | null> {
    return this.read().find((board) => board.shareId === shareId) ?? null;
  }

  async createBoard(name: string, template: TemplateId): Promise<Board> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Give your board a name.");
    const board: Board = {
      id: uid(),
      shareId: uid().replaceAll("-", ""),
      name: trimmed,
      template,
      createdAt: now(),
      columns: TEMPLATES[template].columns.map((columnName, position) => ({
        id: uid(),
        name: columnName,
        position,
        isDone: columnName === "Done",
      })),
      tasks: [],
      members: [],
    };
    this.write([...this.read(), board], board.id);
    return board;
  }

  async getViewer(boardId: string): Promise<Member | null> {
    const memberId = this.viewers()[boardId];
    return (
      this.read()
        .find((board) => board.id === boardId)
        ?.members.find((member) => member.id === memberId) ?? null
    );
  }

  async joinBoard(boardId: string, displayName: string): Promise<Member> {
    const trimmed = displayName.trim();
    if (!trimmed) throw new Error("Enter your display name.");
    const memberId = this.viewers()[boardId];
    const member = this.mutate(boardId, (board) => {
      const existing = board.members.find((item) => item.id === memberId);
      if (existing) {
        existing.displayName = trimmed;
        return existing;
      }
      const joined: Member = {
        id: uid(),
        displayName: trimmed,
        joinedAt: now(),
      };
      board.members.push(joined);
      return joined;
    });
    this.storage.setItem(
      VIEWER_KEY,
      JSON.stringify({ ...this.viewers(), [boardId]: member.id }),
    );
    return member;
  }

  async addColumn(boardId: string, name: string): Promise<BoardColumn> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Give your column a name.");
    return this.mutate(boardId, (board) => {
      const column: BoardColumn = {
        id: uid(),
        name: trimmed,
        position: board.columns.length,
        isDone:
          trimmed.toLocaleLowerCase() === "done" &&
          !board.columns.some((item) => item.isDone),
      };
      board.columns.push(column);
      return column;
    });
  }

  async renameColumn(
    boardId: string,
    columnId: string,
    name: string,
  ): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Give your column a name.");
    this.mutate(boardId, (board) => {
      const column = board.columns.find((item) => item.id === columnId);
      if (!column) throw new Error("Column not found.");
      column.name = trimmed;
      if (
        trimmed.toLocaleLowerCase() === "done" &&
        !board.columns.some((item) => item.isDone)
      ) {
        column.isDone = true;
        board.tasks
          .filter((task) => task.columnId === columnId)
          .forEach((task) => {
            task.completedAt = task.completedAt ?? now();
            task.updatedAt = now();
          });
      }
    });
  }

  async deleteColumn(boardId: string, columnId: string): Promise<void> {
    this.mutate(boardId, (board) => {
      if (board.columns.length < 2)
        throw new Error("A board needs at least one column.");
      const column = board.columns.find((item) => item.id === columnId);
      if (!column) throw new Error("Column not found.");
      const destination = board.columns.find((item) => item.id !== columnId)!;
      let position = board.tasks.filter(
        (task) => task.columnId === destination.id,
      ).length;
      board.tasks
        .filter((task) => task.columnId === columnId)
        .sort((a, b) => a.position - b.position)
        .forEach((task) => {
          task.columnId = destination.id;
          task.position = position++;
          task.completedAt = destination.isDone
            ? (task.completedAt ?? now())
            : null;
          task.updatedAt = now();
        });
      board.columns = board.columns.filter((item) => item.id !== columnId);
      board.columns.forEach((item, index) => {
        item.position = index;
      });
    });
  }

  async moveColumn(
    boardId: string,
    columnId: string,
    toIndex: number,
  ): Promise<void> {
    this.mutate(boardId, (board) => {
      const from = board.columns.findIndex((column) => column.id === columnId);
      if (from < 0) throw new Error("Column not found.");
      const [column] = board.columns.splice(from, 1);
      board.columns.splice(
        Math.max(0, Math.min(toIndex, board.columns.length)),
        0,
        column,
      );
      board.columns.forEach((item, index) => {
        item.position = index;
      });
    });
  }

  async addTask(
    boardId: string,
    columnId: string,
    fields: TaskFields,
  ): Promise<Task> {
    if (!fields.title.trim()) throw new Error("Give your task a title.");
    return this.mutate(boardId, (board) => {
      const column = board.columns.find((item) => item.id === columnId);
      if (!column) throw new Error("Column not found.");
      const task: Task = {
        id: uid(),
        columnId,
        ...fields,
        title: fields.title.trim(),
        position: board.tasks.filter((item) => item.columnId === columnId)
          .length,
        completedAt: column.isDone ? now() : null,
        createdAt: now(),
        updatedAt: now(),
      };
      board.tasks.push(task);
      return task;
    });
  }

  async updateTask(
    boardId: string,
    taskId: string,
    fields: TaskFields,
  ): Promise<void> {
    if (!fields.title.trim()) throw new Error("Give your task a title.");
    this.mutate(boardId, (board) => {
      const task = board.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Task not found.");
      Object.assign(task, fields, {
        title: fields.title.trim(),
        updatedAt: now(),
      });
    });
  }

  async deleteTask(boardId: string, taskId: string): Promise<void> {
    this.mutate(boardId, (board) => {
      const task = board.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Task not found.");
      board.tasks = board.tasks.filter((item) => item.id !== taskId);
      board.tasks
        .filter((item) => item.columnId === task.columnId)
        .sort((a, b) => a.position - b.position)
        .forEach((item, index) => {
          item.position = index;
        });
    });
  }

  async moveTask(
    boardId: string,
    taskId: string,
    toColumnId: string,
    toIndex: number,
  ): Promise<void> {
    this.mutate(boardId, (board) => {
      const task = board.tasks.find((item) => item.id === taskId);
      const destination = board.columns.find((item) => item.id === toColumnId);
      if (!task || !destination)
        throw new Error("Task or destination not found.");
      const oldColumnId = task.columnId;
      const source = board.tasks
        .filter((item) => item.columnId === oldColumnId && item.id !== taskId)
        .sort((a, b) => a.position - b.position);
      const target =
        oldColumnId === toColumnId
          ? source
          : board.tasks
              .filter((item) => item.columnId === toColumnId)
              .sort((a, b) => a.position - b.position);
      task.columnId = toColumnId;
      task.completedAt = destination.isDone
        ? (task.completedAt ?? now())
        : null;
      task.updatedAt = now();
      target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, task);
      source.forEach((item, index) => {
        item.position = index;
      });
      target.forEach((item, index) => {
        item.position = index;
      });
    });
  }

  subscribe(boardId: string, onChange: () => void): () => void {
    const listeners = this.listeners.get(boardId) ?? new Set<() => void>();
    listeners.add(onChange);
    this.listeners.set(boardId, listeners);
    return () => {
      listeners.delete(onChange);
      if (!listeners.size) this.listeners.delete(boardId);
    };
  }
}
