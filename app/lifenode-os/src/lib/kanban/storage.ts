import {
  readScopedLocalStorage,
  userScopedStorageKey,
} from "@/src/lib/userScopedStorage";
import { touchLocalWidgetUpdatedAt } from "@/src/lib/nodeWidgetSync";
import {
  DEFAULT_KANBAN_COLUMNS,
  type KanbanBoard,
  type KanbanCard,
  type KanbanColumn,
  type KanbanStore,
} from "./types";

const STORAGE_BASE = "lifenode.kanban.v1";

function newId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildDefaultColumns(): KanbanColumn[] {
  return DEFAULT_KANBAN_COLUMNS.map((label, order) => ({
    id: newId("col"),
    label,
    order,
  }));
}

function defaultStore(): KanbanStore {
  const now = new Date().toISOString();
  const board: KanbanBoard = {
    id: newId("board"),
    name: "My board",
    columns: buildDefaultColumns(),
    createdAt: now,
    updatedAt: now,
  };
  return {
    boards: [board],
    cards: [],
    activeBoardId: board.id,
  };
}

export function kanbanStorageKey(userId: string | null | undefined): string {
  return userScopedStorageKey(STORAGE_BASE, userId);
}

export function loadKanbanStore(userId: string | null | undefined): KanbanStore {
  if (typeof window === "undefined") return defaultStore();
  const key = kanbanStorageKey(userId);
  const raw = readScopedLocalStorage(key);
  if (!raw) return defaultStore();
  try {
    const parsed = JSON.parse(raw) as Partial<KanbanStore>;
    const boards = Array.isArray(parsed.boards) ? parsed.boards : [];
    const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
    if (boards.length === 0) return defaultStore();
    return {
      boards,
      cards,
      activeBoardId:
        typeof parsed.activeBoardId === "string"
          ? parsed.activeBoardId
          : boards[0]?.id ?? null,
    };
  } catch {
    return defaultStore();
  }
}

export function saveKanbanStore(
  userId: string | null | undefined,
  store: KanbanStore,
): void {
  if (typeof window === "undefined") return;
  const key = kanbanStorageKey(userId);
  window.localStorage.setItem(key, JSON.stringify(store));
  touchLocalWidgetUpdatedAt(key);
}

export function createKanbanBoard(name: string): KanbanBoard {
  const now = new Date().toISOString();
  return {
    id: newId("board"),
    name: name.trim() || "New board",
    columns: buildDefaultColumns(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createKanbanCard(
  boardId: string,
  columnId: string,
  title: string,
  order: number,
): KanbanCard {
  const now = new Date().toISOString();
  return {
    id: newId("card"),
    boardId,
    columnId,
    title: title.trim(),
    order,
    createdAt: now,
    updatedAt: now,
  };
}

export function createKanbanColumn(label: string, order: number): KanbanColumn {
  return {
    id: newId("col"),
    label,
    order,
  };
}
