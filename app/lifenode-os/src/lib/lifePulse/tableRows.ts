import type { LifePulseCategoryId } from "./types";
import { defaultTableColumns } from "./qualifyingQuestions";

export type TrackerTableRow = {
  id: string;
  cells: Record<string, string>;
  /** Project management tag / label */
  label?: string;
};

export function newTableRowId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Table columns that should use a date/time picker instead of plain text. */
export function isDateTimeColumn(col: string): boolean {
  const c = col.trim().toLowerCase();
  return (
    c === "when" ||
    c === "due" ||
    c === "timeline" ||
    c === "schedule" ||
    c.includes("date") ||
    c.includes("time")
  );
}

export function getTableColumns(
  category: LifePulseCategoryId,
  context: Record<string, unknown>,
): string[] {
  const fromCtx = context.table_columns;
  if (Array.isArray(fromCtx) && fromCtx.every((c) => typeof c === "string")) {
    return fromCtx as string[];
  }
  return defaultTableColumns(category);
}

export function getTableRows(
  context: Record<string, unknown>,
): TrackerTableRow[] {
  const raw = context.table_rows;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .map((r, i) => ({
      id: typeof r.id === "string" ? r.id : `row-${i}`,
      cells:
        r.cells && typeof r.cells === "object"
          ? (r.cells as Record<string, string>)
          : {},
      label: typeof r.label === "string" ? r.label : undefined,
    }));
}

export function rowsToContext(
  columns: string[],
  rows: TrackerTableRow[],
): { table_columns: string[]; table_rows: TrackerTableRow[] } {
  return { table_columns: columns, table_rows: rows };
}
