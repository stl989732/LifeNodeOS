import {
  NODE_WIDGET_KEYS,
  scheduleNodeWidgetSave,
} from "@/src/lib/nodeWidgetSync";

export type ProCrmRow = {
  id: string;
  cells: Record<string, string>;
};

export type ProCrmState = {
  rows: ProCrmRow[];
  /** Column names hidden from the board (data kept on rows). */
  hiddenColumns?: string[];
};

export const PRO_CRM_STORAGE_KEY = "lifenode.pronode.projects-crm.v1";

export const PRO_CRM_COLUMNS = [
  "Item",
  "Client",
  "Project",
  "Task",
  "Status",
  "Priority",
  "Deadline",
  "Location",
  "Owner",
  "Sales",
  "Contact",
  "Notes",
] as const;

export type ProCrmColumn = (typeof PRO_CRM_COLUMNS)[number];

export const PRO_CRM_STATUS_OPTIONS = [
  "",
  "Not started",
  "In progress",
  "On hold",
  "Review",
  "Done",
  "Cancelled",
] as const;

export const PRO_CRM_PRIORITY_OPTIONS = ["", "Low", "Medium", "High", "Urgent"] as const;

export function newProCrmRowId(): string {
  return `crm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultProCrmState(): ProCrmState {
  return { rows: [], hiddenColumns: [] };
}

export function getVisibleCrmColumns(hiddenColumns: string[] | undefined): ProCrmColumn[] {
  const hidden = new Set(hiddenColumns ?? []);
  return PRO_CRM_COLUMNS.filter((col) => !hidden.has(col));
}

export function canHideMoreCrmColumns(hiddenColumns: string[] | undefined): boolean {
  return getVisibleCrmColumns(hiddenColumns).length > 1;
}

export function isProCrmDateColumn(col: string): boolean {
  const c = col.trim().toLowerCase();
  return c === "deadline" || c.includes("date");
}

function normalizeRow(raw: unknown, index: number): ProCrmRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const cells =
    o.cells && typeof o.cells === "object"
      ? Object.fromEntries(
          Object.entries(o.cells as Record<string, unknown>).map(([k, v]) => [
            k,
            typeof v === "string" ? v : v == null ? "" : String(v),
          ]),
        )
      : {};
  return {
    id: typeof o.id === "string" ? o.id : `crm-${index}`,
    cells,
  };
}

export function parseProCrmPayload(payload: unknown): ProCrmState {
  if (!payload || typeof payload !== "object") return defaultProCrmState();
  const o = payload as Record<string, unknown>;
  if (!Array.isArray(o.rows)) return defaultProCrmState();
  const rows = o.rows
    .map((r, i) => normalizeRow(r, i))
    .filter((r): r is ProCrmRow => r !== null);
  const hiddenColumns = Array.isArray(o.hiddenColumns)
    ? o.hiddenColumns.filter((c): c is string => typeof c === "string")
    : [];
  return { rows, hiddenColumns };
}

export function loadProCrmFromLocal(storageKey: string): ProCrmState {
  if (typeof window === "undefined") return defaultProCrmState();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultProCrmState();
    return parseProCrmPayload(JSON.parse(raw));
  } catch {
    return defaultProCrmState();
  }
}

export function persistProCrm(storageKey: string, state: ProCrmState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    scheduleNodeWidgetSave(NODE_WIDGET_KEYS.pro.projectsCrm, state);
  } catch {
    /* quota */
  }
}

export function crmRowLabel(row: ProCrmRow): string {
  const project = row.cells.Project?.trim();
  const client = row.cells.Client?.trim();
  const item = row.cells.Item?.trim();
  return project || client || item || "Untitled";
}

export function hasMeaningfulCrmState(state: ProCrmState): boolean {
  const hasRows = state.rows.some((r) =>
    Object.values(r.cells).some((v) => (v ?? "").trim().length > 0),
  );
  const hasHidden = (state.hiddenColumns?.length ?? 0) > 0;
  return hasRows || hasHidden;
}
