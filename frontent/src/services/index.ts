import type { BoardService } from "./boardService";
import { MockBoardService } from "./mockBoardService";

export const boardService: BoardService = new MockBoardService();
