import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Copy,
  GripVertical,
  LayoutDashboard,
  Link2,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { boardService } from "./services";
import type {
  Board,
  BoardColumn,
  Member,
  Priority,
  Task,
  TaskFields,
  TemplateId,
} from "./types";
import { TEMPLATES } from "./types";
import { dateKey, dueLabel, initials, matchesTask } from "./utils";

type Modal =
  | { kind: "create" }
  | { kind: "task"; columnId: string; taskId?: string }
  | { kind: "share" }
  | { kind: "deleteTask"; taskId: string }
  | { kind: "deleteColumn"; columnId: string }
  | null;

const EMPTY_FILTERS = {
  search: "",
  priority: "all" as Priority | "all",
  due: "all",
  assignee: "all",
};
const routeShareId = () =>
  window.location.pathname.match(/^\/board\/([^/]+)\/?$/)?.[1] ?? null;

function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: "normal" | "small";
}) {
  const palette = ["lavender", "coral", "mint", "blue"];
  const index =
    [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) %
    palette.length;
  return (
    <span
      className={`avatar avatar-${palette[index]} ${size === "small" ? "avatar-small" : ""}`}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

function Dialog({
  children,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`dialog ${wide ? "dialog-wide" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

function CreateBoardDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, template: TemplateId) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<TemplateId>("default");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name, template);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog onClose={onClose} wide>
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">NEW WORKSPACE</span>
          <h2>Create a board</h2>
          <p>A little structure for the work ahead.</p>
        </div>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="board-name">
          Board name
        </label>
        <input
          id="board-name"
          className="field-input"
          autoFocus
          placeholder="e.g. Marketing launch"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          required
        />
        <div className="field-label template-label">Start with a template</div>
        <div className="template-options">
          {(
            Object.entries(TEMPLATES) as [
              TemplateId,
              (typeof TEMPLATES)[TemplateId],
            ][]
          ).map(([id, option]) => (
            <button
              type="button"
              key={id}
              className={`template-option ${template === id ? "selected" : ""}`}
              onClick={() => setTemplate(id)}
              aria-pressed={template === id}
            >
              <span className="template-icon">
                <ClipboardList size={20} />
              </span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
              <span className="template-preview">
                {option.columns.slice(0, 3).map((column) => (
                  <i key={column}>{column}</i>
                ))}
              </span>
            </button>
          ))}
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={saving || !name.trim()}
          >
            {saving ? "Creating…" : "Create board"} <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function JoinDialog({
  board,
  onJoin,
}: {
  board: Board;
  onJoin: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onJoin(name);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="modal-backdrop join-backdrop">
      <div
        className="dialog join-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
      >
        <div className="join-icon">
          <Users size={25} />
        </div>
        <span className="eyebrow">YOU'RE INVITED</span>
        <h2 id="join-title">Join {board.name}</h2>
        <p>
          Enter a display name so your teammates know it’s you. No account
          needed.
        </p>
        <div className="join-members">
          <div className="avatar-stack">
            {board.members.slice(0, 3).map((member) => (
              <Avatar key={member.id} name={member.displayName} size="small" />
            ))}
          </div>
          <span>
            {board.members.length
              ? `${board.members.length} people on this board`
              : "Be the first to join"}
          </span>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="display-name">
            Your display name
          </label>
          <input
            id="display-name"
            autoFocus
            className="field-input"
            placeholder="e.g. Alex Morgan"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            required
          />
          <button
            className="button button-primary button-full"
            disabled={saving || !name.trim()}
          >
            {saving ? "Joining…" : "Join board"} <ArrowRight size={16} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            window.history.pushState({}, "", "/");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
        >
          Back to boards
        </button>
      </div>
    </div>
  );
}

function TaskDialog({
  board,
  columnId,
  task,
  onClose,
  onSave,
  onDelete,
}: {
  board: Board;
  columnId: string;
  task?: Task;
  onClose: () => void;
  onSave: (fields: TaskFields) => Promise<void>;
  onDelete: () => void;
}) {
  const [fields, setFields] = useState<TaskFields>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? null,
    dueDate: task?.dueDate ?? null,
    assigneeId: task?.assigneeId ?? null,
  });
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!fields.title.trim()) return;
    setSaving(true);
    try {
      await onSave(fields);
    } finally {
      setSaving(false);
    }
  }
  const column = board.columns.find((item) => item.id === columnId);
  return (
    <Dialog onClose={onClose} wide>
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">{column?.name.toUpperCase()} · TASK</span>
          <h2>{task ? "Edit task" : "Create a task"}</h2>
          <p>
            {task
              ? "Keep the details up to date."
              : "Start with a title. The rest can come later."}
          </p>
        </div>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="task-title">
          Task title <span>*</span>
        </label>
        <input
          id="task-title"
          className="field-input"
          autoFocus
          placeholder="What needs to get done?"
          value={fields.title}
          onChange={(event) =>
            setFields({ ...fields, title: event.target.value })
          }
          maxLength={160}
          required
        />
        <label className="field-label field-spaced" htmlFor="task-description">
          Description
        </label>
        <textarea
          id="task-description"
          className="field-input field-textarea"
          rows={4}
          placeholder="Add a little context…"
          value={fields.description}
          onChange={(event) =>
            setFields({ ...fields, description: event.target.value })
          }
        />
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="task-priority">
              Priority
            </label>
            <select
              id="task-priority"
              className="field-input field-select"
              value={fields.priority ?? ""}
              onChange={(event) =>
                setFields({
                  ...fields,
                  priority: (event.target.value || null) as Priority,
                })
              }
            >
              <option value="">No priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="task-due">
              Due date
            </label>
            <input
              id="task-due"
              type="date"
              className="field-input"
              value={fields.dueDate ?? ""}
              onChange={(event) =>
                setFields({ ...fields, dueDate: event.target.value || null })
              }
            />
          </div>
        </div>
        <label className="field-label field-spaced" htmlFor="task-assignee">
          Assignee
        </label>
        <select
          id="task-assignee"
          className="field-input field-select"
          value={fields.assigneeId ?? ""}
          onChange={(event) =>
            setFields({ ...fields, assigneeId: event.target.value || null })
          }
        >
          <option value="">Unassigned</option>
          {board.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
        <div className="dialog-actions dialog-actions-between">
          {task ? (
            <button
              type="button"
              className="button button-danger"
              onClick={onDelete}
            >
              <Trash2 size={16} /> Delete task
            </button>
          ) : (
            <span />
          )}
          <div>
            <button
              type="button"
              className="button button-ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={saving || !fields.title.trim()}
            >
              {saving ? "Saving…" : task ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function TaskCard({
  task,
  index,
  board,
  onEdit,
  dragDisabled,
}: {
  task: Task;
  index: number;
  board: Board;
  onEdit: () => void;
  dragDisabled: boolean;
}) {
  const sortable = useSortable({
    id: `task:${task.id}`,
    index,
    group: task.columnId,
    type: "task",
    accept: "task",
    disabled: dragDisabled,
  });
  const assignee = board.members.find(
    (member) => member.id === task.assigneeId,
  );
  const due = dueLabel(task);
  const overdue =
    !!task.dueDate && task.dueDate < dateKey() && !task.completedAt;
  return (
    <article
      ref={sortable.ref}
      className={`task-card ${sortable.isDragging ? "is-dragging" : ""}`}
    >
      <div className="task-card-top">
        <span className={`task-priority ${task.priority ?? "none"}`}>
          {task.priority ? (
            <>
              <i />
              {task.priority}
            </>
          ) : (
            "TASK"
          )}
        </span>
        <div className="task-card-actions">
          <button
            ref={sortable.handleRef}
            className="icon-button drag-handle"
            aria-label={`Drag ${task.title}`}
            title={dragDisabled ? "Clear filters to drag" : "Drag task"}
            disabled={dragDisabled}
          >
            <GripVertical size={16} />
          </button>
          <button
            className="icon-button"
            aria-label={`Edit ${task.title}`}
            onClick={onEdit}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
      <button className="task-title" onClick={onEdit}>
        {task.title}
      </button>
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}
      <div className="task-card-bottom">
        <span
          className={`due-tag ${overdue ? "overdue" : ""} ${task.completedAt ? "complete" : ""}`}
        >
          {task.completedAt ? (
            <>
              <Check size={13} /> Complete
            </>
          ) : due ? (
            <>
              <CalendarDays size={13} /> {due}
            </>
          ) : (
            <span className="no-due">No due date</span>
          )}
        </span>
        {assignee ? (
          <Avatar name={assignee.displayName} size="small" />
        ) : (
          <span className="unassigned-avatar" title="Unassigned">
            <Users size={14} />
          </span>
        )}
      </div>
    </article>
  );
}

function KanbanColumn({
  board,
  column,
  index,
  tasks,
  onAddTask,
  onEditTask,
  onRename,
  onDelete,
  dragDisabled,
}: {
  board: Board;
  column: BoardColumn;
  index: number;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  dragDisabled: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const sortable = useSortable({
    id: `column:${column.id}`,
    index,
    group: "columns",
    type: "column",
    accept: "column",
    disabled: dragDisabled,
  });
  const drop = useDroppable({
    id: `drop:${column.id}`,
    type: "column-drop",
    accept: "task",
    collisionPriority: -1,
    disabled: dragDisabled,
  });
  function saveName(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) {
      onRename(name);
      setEditing(false);
    }
  }
  const count = board.tasks.filter(
    (task) => task.columnId === column.id,
  ).length;
  return (
    <section
      ref={sortable.ref}
      className={`kanban-column ${sortable.isDragging ? "is-dragging" : ""} ${drop.isDropTarget ? "is-drop-target" : ""}`}
      aria-label={`${column.name} column`}
    >
      <div className="column-header">
        <button
          ref={sortable.handleRef}
          className="icon-button column-grip"
          aria-label={`Drag ${column.name} column`}
          disabled={dragDisabled}
        >
          <GripVertical size={17} />
        </button>
        <span className={`column-dot ${column.isDone ? "done" : ""}`} />
        {editing ? (
          <form onSubmit={saveName} className="column-name-form">
            <input
              autoFocus
              aria-label="Column name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => {
                if (name.trim()) {
                  onRename(name);
                  setEditing(false);
                }
              }}
              maxLength={60}
            />
          </form>
        ) : (
          <h3>{column.name}</h3>
        )}
        <span className="column-count">{count}</span>
        <div className="column-menu-wrap">
          <button
            className="icon-button"
            aria-label={`${column.name} options`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal size={19} />
          </button>
          {menuOpen && (
            <div className="popover-menu">
              <button
                onClick={() => {
                  setEditing(true);
                  setMenuOpen(false);
                }}
              >
                Rename column
              </button>
              <button
                className="danger"
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
              >
                Delete column
              </button>
            </div>
          )}
        </div>
      </div>
      <div ref={drop.ref} className="column-body">
        {tasks.map((task, taskIndex) => (
          <TaskCard
            key={task.id}
            task={task}
            index={taskIndex}
            board={board}
            onEdit={() => onEditTask(task)}
            dragDisabled={dragDisabled}
          />
        ))}
        {tasks.length === 0 && (
          <div className="empty-column">
            <span className="empty-column-icon">
              <Plus size={20} />
            </span>
            <p>{count ? "No matching tasks" : "Nothing here yet"}</p>
            <small>
              {count
                ? "Try clearing your filters"
                : "Drop a task here or create one"}
            </small>
          </div>
        )}
      </div>
      <button className="add-task-button" onClick={onAddTask}>
        <Plus size={17} /> Add task
      </button>
    </section>
  );
}

export default function App() {
  const [shareId, setShareId] = useState<string | null>(routeShareId);
  const [boards, setBoards] = useState<Board[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [viewer, setViewer] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [toast, setToast] = useState("");
  const [columnName, setColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, "", path);
    setShareId(routeShareId());
    setFilters(EMPTY_FILTERS);
    setModal(null);
  }, []);
  const reload = useCallback(async () => {
    const nextBoards = await boardService.listBoards();
    setBoards(nextBoards);
    if (shareId) {
      const nextBoard = await boardService.getBoardByShareId(shareId);
      setBoard(nextBoard);
      setViewer(nextBoard ? await boardService.getViewer(nextBoard.id) : null);
    } else {
      setBoard(null);
      setViewer(null);
    }
    setLoading(false);
  }, [shareId]);

  useEffect(() => {
    const onPop = () => {
      setShareId(routeShareId());
      setModal(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);
  useEffect(() => {
    if (!board) return;
    return boardService.subscribe(board.id, () => {
      void reload();
    });
  }, [board?.id, reload]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      await reload();
      if (success) setToast(success);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  }
  async function createBoard(name: string, template: TemplateId) {
    const created = await boardService.createBoard(name, template);
    navigate(`/board/${created.shareId}`);
    setToast("Board created.");
  }
  async function join(name: string) {
    if (!board) return;
    await boardService.joinBoard(board.id, name);
    await reload();
    setToast(`Welcome to ${board.name}.`);
  }
  async function copyLink() {
    if (!board) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/board/${board.shareId}`,
      );
      setToast("Board link copied.");
    } catch {
      setToast("Copy the link shown below.");
    }
  }
  async function addColumn(event: FormEvent) {
    event.preventDefault();
    if (!board || !columnName.trim()) return;
    await run(
      () => boardService.addColumn(board.id, columnName),
      "Column added.",
    );
    setColumnName("");
    setAddingColumn(false);
  }
  async function dragEnd(
    event: Parameters<
      NonNullable<React.ComponentProps<typeof DragDropProvider>["onDragEnd"]>
    >[0],
  ) {
    if (event.canceled || !board) return;
    const { source, target } = event.operation;
    if (!isSortable(source)) return;
    if (source.type === "column") {
      if (source.initialIndex !== source.index)
        await run(() =>
          boardService.moveColumn(
            board.id,
            String(source.id).slice(7),
            source.index,
          ),
        );
      return;
    }
    if (source.type === "task") {
      const taskId = String(source.id).slice(5);
      const targetColumn = String(target?.id).startsWith("drop:")
        ? String(target?.id).slice(5)
        : String(source.group ?? source.initialGroup ?? "");
      if (!targetColumn) return;
      const toIndex = String(target?.id).startsWith("drop:")
        ? board.tasks.filter((task) => task.columnId === targetColumn).length
        : source.index;
      const task = board.tasks.find((item) => item.id === taskId);
      if (task && (task.columnId !== targetColumn || task.position !== toIndex))
        await run(() =>
          boardService.moveTask(board.id, taskId, targetColumn, toIndex),
        );
    }
  }

  const activeFilters =
    !!filters.search.trim() ||
    filters.priority !== "all" ||
    filters.due !== "all" ||
    filters.assignee !== "all";
  const visibleTaskCount = useMemo(
    () => board?.tasks.filter((task) => matchesTask(task, filters)).length ?? 0,
    [board, filters],
  );
  const doneCount =
    board?.tasks.filter((task) => !!task.completedAt).length ?? 0;
  const taskModal =
    modal?.kind === "task" && board
      ? {
          columnId: modal.columnId,
          task: board.tasks.find((task) => task.id === modal.taskId),
        }
      : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("/")}>
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            mini<span>flow</span>
          </span>
        </button>
        <div className="workspace-switch">
          <span className="workspace-icon">M</span>
          <div>
            <strong>My workspace</strong>
            <small>Free workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <button
          className={`sidebar-link ${!shareId ? "active" : ""}`}
          onClick={() => navigate("/")}
        >
          <LayoutDashboard size={18} /> Overview
        </button>
        <div className="sidebar-section-label board-label">
          YOUR BOARDS{" "}
          <button
            aria-label="Create board"
            title="Create board"
            onClick={() => setModal({ kind: "create" })}
          >
            <Plus size={17} />
          </button>
        </div>
        <div className="sidebar-boards">
          {boards.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link board-link ${item.shareId === shareId ? "active" : ""}`}
              onClick={() => navigate(`/board/${item.shareId}`)}
            >
              <span className="board-mini-icon">
                {item.name[0]?.toUpperCase()}
              </span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        <button
          className="sidebar-create"
          onClick={() => setModal({ kind: "create" })}
        >
          <Plus size={16} /> Create a board
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span>
              <CircleHelp size={18} />
            </span>
            <div>
              <strong>Made for momentum</strong>
              <p>A simple place to keep work moving.</p>
            </div>
          </div>
          <div className="sidebar-profile">
            <Avatar name={viewer?.displayName ?? "Your workspace"} />
            <div>
              <strong>{viewer?.displayName ?? "Your workspace"}</strong>
              <small>{viewer ? "Board member" : "Ready when you are"}</small>
            </div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button onClick={() => navigate("/")}>Workspace</button>
            <span>/</span>
            <strong>{board?.name ?? (shareId ? "Board" : "Overview")}</strong>
          </div>
          <div className="topbar-right">
            <span className="mock-pill">
              <span /> Mock workspace
            </span>
            {board && viewer && (
              <button
                className="button button-outline topbar-share"
                onClick={() => setModal({ kind: "share" })}
              >
                <Link2 size={16} /> Share board
              </button>
            )}
            <Avatar name={viewer?.displayName ?? "Guest"} size="small" />
          </div>
        </header>
        <main className="main-content">
          {loading ? (
            <div className="loading-state">Loading your workspace…</div>
          ) : !shareId ? (
            <>
              <div className="home-hero">
                <div className="hero-copy">
                  <span className="hero-eyebrow">
                    <Sparkles size={15} /> A CLEARER WAY TO WORK
                  </span>
                  <h1>
                    Good work starts
                    <br />
                    with a little flow<span>.</span>
                  </h1>
                  <p>
                    Keep every idea, task and teammate moving in the same
                    direction. Simple boards for what matters most.
                  </p>
                  <button
                    className="button button-primary hero-button"
                    onClick={() => setModal({ kind: "create" })}
                  >
                    <Plus size={18} /> Create your board
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-board">
                    <div>
                      <span /> To Do <small>3</small>
                    </div>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="art-float">
                    <Check size={16} /> All in motion
                  </div>
                </div>
              </div>
              <div className="home-section-heading">
                <div>
                  <span className="eyebrow">YOUR SPACE</span>
                  <h2>Boards</h2>
                  <p>Pick up where you left off.</p>
                </div>
                <button
                  className="button button-outline"
                  onClick={() => setModal({ kind: "create" })}
                >
                  <Plus size={17} /> New board
                </button>
              </div>
              <div className="board-grid">
                {boards.map((item, index) => (
                  <button
                    className="board-tile"
                    key={item.id}
                    onClick={() => navigate(`/board/${item.shareId}`)}
                  >
                    <div className={`tile-art tile-art-${index % 3}`}>
                      <span className="tile-column">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="tile-column">
                        <i />
                        <i />
                      </span>
                      <span className="tile-column">
                        <i />
                      </span>
                    </div>
                    <div className="tile-content">
                      <span className="tile-icon">
                        {item.name[0]?.toUpperCase()}
                      </span>
                      <span className="tile-arrow">
                        <ArrowRight size={19} />
                      </span>
                      <h3>{item.name}</h3>
                      <p>
                        {item.tasks.length} tasks <span>·</span>{" "}
                        {item.members.length} members
                      </p>
                    </div>
                  </button>
                ))}
                <button
                  className="board-tile new-board-tile"
                  onClick={() => setModal({ kind: "create" })}
                >
                  <span className="new-board-icon">
                    <Plus size={24} />
                  </span>
                  <strong>Create a new board</strong>
                  <p>Give your next project a home.</p>
                </button>
              </div>
              <div className="home-tip">
                <span>
                  <Sparkles size={17} />
                </span>
                <p>
                  <strong>Start with a template.</strong> Create a personal,
                  software, or weekly board and make it your own.
                </p>
                <button onClick={() => setModal({ kind: "create" })}>
                  Explore templates <ArrowRight size={15} />
                </button>
              </div>
            </>
          ) : !board ? (
            <div className="not-found">
              <ClipboardList size={40} />
              <h1>Board not found</h1>
              <p>This link does not point to a board in this mock workspace.</p>
              <button
                className="button button-primary"
                onClick={() => navigate("/")}
              >
                <ArrowLeft size={16} /> Back to boards
              </button>
            </div>
          ) : (
            <>
              <div className="board-heading">
                <div>
                  <div className="board-kicker">
                    <span className="eyebrow">PROJECT BOARD</span>
                    <span className="kicker-separator">·</span>
                    <span>{board.columns.length} columns</span>
                  </div>
                  <h1>{board.name}</h1>
                  <p>Everything in its place. Keep your team moving forward.</p>
                </div>
                <div className="board-heading-actions">
                  <div className="members-group">
                    <div className="avatar-stack">
                      {board.members.slice(0, 4).map((member) => (
                        <Avatar key={member.id} name={member.displayName} />
                      ))}
                    </div>
                    <span>{board.members.length} members</span>
                  </div>
                  <button
                    className="button button-primary"
                    onClick={() =>
                      setModal({ kind: "task", columnId: board.columns[0].id })
                    }
                  >
                    <Plus size={17} /> New task
                  </button>
                </div>
              </div>
              <div className="board-summary">
                <span className="summary-item">
                  <span className="summary-icon icon-purple">
                    <ClipboardList size={18} />
                  </span>
                  <span>
                    <strong>{board.tasks.length}</strong>
                    <small>Total tasks</small>
                  </span>
                </span>
                <span className="summary-divider" />
                <span className="summary-item">
                  <span className="summary-icon icon-orange">
                    <SlidersHorizontal size={18} />
                  </span>
                  <span>
                    <strong>{board.tasks.length - doneCount}</strong>
                    <small>In progress</small>
                  </span>
                </span>
                <span className="summary-divider" />
                <span className="summary-item">
                  <span className="summary-icon icon-green">
                    <Check size={18} />
                  </span>
                  <span>
                    <strong>{doneCount}</strong>
                    <small>Completed</small>
                  </span>
                </span>
              </div>
              <div className="toolbar">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    aria-label="Search tasks"
                    placeholder="Search tasks…"
                    value={filters.search}
                    onChange={(event) =>
                      setFilters({ ...filters, search: event.target.value })
                    }
                  />
                  {filters.search && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setFilters({ ...filters, search: "" })}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <div className="toolbar-filters">
                  <span className="filter-label">
                    <SlidersHorizontal size={17} /> Filters
                  </span>
                  <select
                    aria-label="Filter by priority"
                    value={filters.priority ?? "all"}
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        priority: event.target.value as Priority | "all",
                      })
                    }
                  >
                    <option value="all">All priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <select
                    aria-label="Filter by due status"
                    value={filters.due}
                    onChange={(event) =>
                      setFilters({ ...filters, due: event.target.value })
                    }
                  >
                    <option value="all">Any due date</option>
                    <option value="soon">Due soon</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <select
                    aria-label="Filter by assignee"
                    value={filters.assignee}
                    onChange={(event) =>
                      setFilters({ ...filters, assignee: event.target.value })
                    }
                  >
                    <option value="all">All assignees</option>
                    <option value="unassigned">Unassigned</option>
                    {board.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                  {activeFilters && (
                    <button
                      className="clear-filters"
                      onClick={() => setFilters(EMPTY_FILTERS)}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
              {activeFilters && (
                <div className="filter-result">
                  Showing {visibleTaskCount} of {board.tasks.length} tasks ·
                  Clear filters to drag and reorder
                </div>
              )}
              <DragDropProvider
                onDragEnd={(event) => {
                  void dragEnd(event);
                }}
              >
                <div className="board-canvas">
                  {[...board.columns]
                    .sort((a, b) => a.position - b.position)
                    .map((column, index) => (
                      <KanbanColumn
                        key={column.id}
                        board={board}
                        column={column}
                        index={index}
                        tasks={board.tasks
                          .filter(
                            (task) =>
                              task.columnId === column.id &&
                              matchesTask(task, filters),
                          )
                          .sort((a, b) => a.position - b.position)}
                        onAddTask={() =>
                          setModal({ kind: "task", columnId: column.id })
                        }
                        onEditTask={(task) =>
                          setModal({
                            kind: "task",
                            columnId: column.id,
                            taskId: task.id,
                          })
                        }
                        onRename={(name) => {
                          void run(
                            () =>
                              boardService.renameColumn(
                                board.id,
                                column.id,
                                name,
                              ),
                            "Column renamed.",
                          );
                        }}
                        onDelete={() =>
                          setModal({
                            kind: "deleteColumn",
                            columnId: column.id,
                          })
                        }
                        dragDisabled={activeFilters}
                      />
                    ))}
                  <div className="new-column-wrap">
                    {addingColumn ? (
                      <form
                        className="new-column-form"
                        onSubmit={(event) => {
                          void addColumn(event);
                        }}
                      >
                        <input
                          aria-label="New column name"
                          autoFocus
                          placeholder="Column name"
                          value={columnName}
                          onChange={(event) =>
                            setColumnName(event.target.value)
                          }
                          maxLength={60}
                          required
                        />
                        <div>
                          <button
                            className="button button-primary"
                            disabled={!columnName.trim()}
                          >
                            Add column
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Cancel new column"
                            onClick={() => {
                              setAddingColumn(false);
                              setColumnName("");
                            }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        className="new-column-button"
                        onClick={() => setAddingColumn(true)}
                      >
                        <Plus size={19} /> Add a column
                      </button>
                    )}
                  </div>
                </div>
              </DragDropProvider>
            </>
          )}
        </main>
      </div>
      {modal?.kind === "create" && (
        <CreateBoardDialog
          onClose={() => setModal(null)}
          onCreate={createBoard}
        />
      )}
      {board && modal?.kind === "share" && (
        <Dialog onClose={() => setModal(null)}>
          <div className="dialog-heading">
            <div>
              <span className="eyebrow">WORK TOGETHER</span>
              <h2>Share this board</h2>
              <p>Anyone with this link can join and edit the board.</p>
            </div>
            <button
              className="icon-button"
              aria-label="Close"
              onClick={() => setModal(null)}
            >
              <X size={19} />
            </button>
          </div>
          <div className="share-box">
            <Link2 size={18} />
            <input
              aria-label="Board link"
              readOnly
              value={`${window.location.origin}/board/${board.shareId}`}
            />
            <button
              onClick={() => {
                void copyLink();
              }}
              aria-label="Copy board link"
            >
              <Copy size={17} />
            </button>
          </div>
          <p className="share-note">
            In mock mode, data is shared between tabs in this browser. A real
            backend will enable sharing across devices.
          </p>
          <div className="dialog-actions">
            <button
              className="button button-primary"
              onClick={() => {
                void copyLink();
              }}
            >
              <Copy size={16} /> Copy link
            </button>
          </div>
        </Dialog>
      )}
      {board && taskModal && (
        <TaskDialog
          key={taskModal.task?.id ?? taskModal.columnId}
          board={board}
          columnId={taskModal.columnId}
          task={taskModal.task}
          onClose={() => setModal(null)}
          onSave={async (fields) => {
            try {
              if (taskModal.task)
                await boardService.updateTask(
                  board.id,
                  taskModal.task.id,
                  fields,
                );
              else
                await boardService.addTask(
                  board.id,
                  taskModal.columnId,
                  fields,
                );
              setModal(null);
              await reload();
              setToast(taskModal.task ? "Task updated." : "Task created.");
            } catch (error) {
              setToast(
                error instanceof Error ? error.message : "Could not save task.",
              );
            }
          }}
          onDelete={() =>
            setModal({ kind: "deleteTask", taskId: taskModal.task!.id })
          }
        />
      )}
      {board && modal?.kind === "deleteTask" && (
        <Dialog onClose={() => setModal(null)}>
          <div className="confirm-icon">
            <Trash2 size={23} />
          </div>
          <h2>Delete this task?</h2>
          <p className="confirm-copy">
            This action cannot be undone. The task will be permanently removed.
          </p>
          <div className="dialog-actions">
            <button
              className="button button-ghost"
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className="button button-danger-solid"
              onClick={() => {
                void run(
                  () => boardService.deleteTask(board.id, modal.taskId),
                  "Task deleted.",
                );
                setModal(null);
              }}
            >
              Delete task
            </button>
          </div>
        </Dialog>
      )}
      {board && modal?.kind === "deleteColumn" && (
        <Dialog onClose={() => setModal(null)}>
          <div className="confirm-icon">
            <Trash2 size={23} />
          </div>
          <h2>Delete this column?</h2>
          <p className="confirm-copy">
            Tasks in this column will move to the first remaining column.
          </p>
          <div className="dialog-actions">
            <button
              className="button button-ghost"
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className="button button-danger-solid"
              onClick={() => {
                void run(
                  () => boardService.deleteColumn(board.id, modal.columnId),
                  "Column deleted.",
                );
                setModal(null);
              }}
            >
              Delete column
            </button>
          </div>
        </Dialog>
      )}
      {board && !viewer && !loading && (
        <JoinDialog board={board} onJoin={join} />
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
