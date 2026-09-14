import type {
  Board,
  BoardColumn,
  Member,
  Task,
  TaskFields,
  TemplateId,
} from "../types";

/** The UI only depends on this contract. */
export interface BoardService {
  listBoards(): Promise<Board[]>;
  moveBoard(boardId: string, toIndex: number): Promise<void>;
  sortBoardsByName(): Promise<void>;
  getBoardByShareId(shareId: string): Promise<Board | null>;
  createBoard(name: string, template: TemplateId): Promise<Board>;
  getViewer(boardId: string): Promise<Member | null>;
  getPreferredDisplayName(): string | null;
  joinBoard(boardId: string, displayName: string): Promise<Member>;
  addColumn(boardId: string, name: string): Promise<BoardColumn>;
  renameColumn(boardId: string, columnId: string, name: string): Promise<void>;
  deleteColumn(boardId: string, columnId: string): Promise<void>;
  moveColumn(boardId: string, columnId: string, toIndex: number): Promise<void>;
  addTask(boardId: string, columnId: string, fields: TaskFields): Promise<Task>;
  updateTask(
    boardId: string,
    taskId: string,
    fields: TaskFields,
  ): Promise<void>;
  deleteTask(boardId: string, taskId: string): Promise<void>;
  moveTask(
    boardId: string,
    taskId: string,
    toColumnId: string,
    toIndex: number,
  ): Promise<void>;
  subscribe(boardId: string, onChange: () => void): () => void;
}
