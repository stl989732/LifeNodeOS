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

function emptyStore(): KanbanStore {
  return { boards: [], cards: [], activeBoardId: null };
}

/** Legacy auto-seeded board with no user cards — safe to drop on load. */
function isLegacyDefaultBoard(board: KanbanBoard, cards: KanbanCard[]): boolean {
  if (board.name !== "My board") return false;
  if (cards.some((c) => c.boardId === board.id)) return false;
  const labels = [...board.columns]
    .sort((a, b) => a.order - b.order)
    .map((c) => c.label);
  const expected = [...DEFAULT_KANBAN_COLUMNS];
  return (
    labels.length === expected.length &&
    labels.every((label, i) => label === expected[i])
  );
}

/** Strip auto-seeded "My board" and normalize active board id. */
export function normalizeKanbanStore(store: KanbanStore): KanbanStore {
  const legacyIds = new Set(
    store.boards
      .filter((b) => isLegacyDefaultBoard(b, store.cards))
      .map((b) => b.id),
  );
  if (legacyIds.size === 0) return store;

  const boards = store.boards.filter((b) => !legacyIds.has(b.id));
  const cards = store.cards.filter((c) => !legacyIds.has(c.boardId));
  const activeBoardId =
    store.activeBoardId && boards.some((b) => b.id === store.activeBoardId)
      ? store.activeBoardId
      : (boards[0]?.id ?? null);

  return { boards, cards, activeBoardId };
}

export function kanbanStorageKey(userId: string | null | undefined): string {
  return userScopedStorageKey(STORAGE_BASE, userId);
}

export function loadKanbanStore(userId: string | null | undefined): KanbanStore {
  if (typeof window === "undefined") return emptyStore();
  const key = kanbanStorageKey(userId);
  const raw = readScopedLocalStorage(key);
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Partial<KanbanStore>;
    const boards = Array.isArray(parsed.boards) ? parsed.boards : [];
    const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
    const loaded: KanbanStore = {
      boards,
      cards,
      activeBoardId:
        typeof parsed.activeBoardId === "string"
          ? parsed.activeBoardId
          : (boards[0]?.id ?? null),
    };
    const normalized = normalizeKanbanStore(loaded);
    if (
      normalized.boards.length !== loaded.boards.length &&
      typeof window !== "undefined"
    ) {
      window.localStorage.setItem(key, JSON.stringify(normalized));
      touchLocalWidgetUpdatedAt(key);
    }
    return normalized;
  } catch {
    return emptyStore();
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
