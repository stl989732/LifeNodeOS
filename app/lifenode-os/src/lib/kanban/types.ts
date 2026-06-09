export type KanbanColumn = {
  id: string;
  label: string;
  order: number;
};

export type KanbanCard = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  notes?: string;
  /** ISO date YYYY-MM-DD */
  targetDate?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type KanbanBoard = {
  id: string;
  name: string;
  columns: KanbanColumn[];
  createdAt: string;
  updatedAt: string;
};

export type KanbanStore = {
  boards: KanbanBoard[];
  cards: KanbanCard[];
  activeBoardId: string | null;
};

/** Seven core labels plus eight extras (15 total presets). */
export const KANBAN_COLUMN_PRESETS = [
  "Ideas",
  "Tasks",
  "To-do",
  "Ongoing",
  "To review",
  "For approval",
  "Done/Close",
  "Backlog",
  "Blocked",
  "Waiting",
  "In progress",
  "Scheduled",
  "On hold",
  "Archived",
  "Cancelled",
] as const;

export type KanbanColumnPreset = (typeof KANBAN_COLUMN_PRESETS)[number];

export const DEFAULT_KANBAN_COLUMNS: KanbanColumnPreset[] = [
  "Ideas",
  "To-do",
  "Ongoing",
  "To review",
  "Done/Close",
];
