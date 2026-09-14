import type { BoardService } from "./boardService";
import { ApiBoardService } from "./apiBoardService";

export const boardService: BoardService = new ApiBoardService();
