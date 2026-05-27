import { defaultTableColumns } from "./qualifyingQuestions";
import { newTableRowId } from "./tableRows";
import type { LifePulseCategoryId } from "./types";
import type { PlanTableRow } from "./structuredPlans";

function slugKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[/\\]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Maps AI field slugs → exact Plan Table column headers per category. */
const FIELD_TO_COLUMN: Partial<
  Record<LifePulseCategoryId, Record<string, string>>
> = {
  events: {
    item: "Item",
    step: "Item",
    day: "Item",
    task: "Item",
    event_guest: "Event / Guest",
    event: "Event / Guest",
    guest: "Event / Guest",
    speaker: "Event / Guest",
    budget: "Budget",
    cost: "Budget",
    amount: "Budget",
    notes: "Notes",
    note: "Notes",
    detail: "Notes",
  },
  travel: {
    item: "Item",
    day: "Item",
    step: "Item",
    destination_cost: "Destination / Cost",
    destination: "Destination / Cost",
    dest: "Destination / Cost",
    location: "Destination / Cost",
    amount: "Amount",
    cost: "Amount",
    budget: "Amount",
    price: "Amount",
    notes: "Notes",
    note: "Notes",
    detail: "Notes",
  },
  study: {
    day: "Day",
    topic: "Topic",
    lesson_focus: "Lesson / Focus",
    lesson: "Lesson / Focus",
    focus: "Lesson / Focus",
    status: "Status",
  },
  skincare: {
    step: "Step",
    day: "Step",
    product: "Product",
    routine: "Routine",
    days: "Days",
  },
  life: {
    milestone: "Milestone",
    action: "Action",
    timeline: "Timeline",
    notes: "Notes",
  },
  social_media: {
    day: "Day",
    content_idea: "Content Idea",
    idea: "Content Idea",
    topic: "Content Idea",
    platform: "Platform",
    best_time: "Best Time",
    time: "Best Time",
  },
  pets: {
    task: "Task",
    schedule: "Schedule",
    food_care: "Food / Care",
    food: "Food / Care",
    care: "Food / Care",
    notes: "Notes",
  },
  business_goals: {
    step: "Step",
    action: "Action",
    budget: "Budget",
    timeline: "Timeline",
  },
  project_management: {
    task: "Task",
    label: "Label",
    due: "Due",
    status: "Status",
    notes: "Notes",
  },
};

function stringVal(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function mapFlatRowToCells(
  row: Record<string, unknown>,
  category: LifePulseCategoryId,
  columns: string[],
): Record<string, string> {
  const fieldMap = FIELD_TO_COLUMN[category] ?? {};
  const cells: Record<string, string> = {};
  for (const col of columns) cells[col] = "";

  for (const [rawKey, rawVal] of Object.entries(row)) {
    if (rawKey === "id" || rawKey === "label") continue;
    const val = stringVal(rawVal);
    if (!val) continue;

    const sk = slugKey(rawKey);
    const mappedCol = fieldMap[sk];
    if (mappedCol && columns.includes(mappedCol)) {
      cells[mappedCol] = val;
      continue;
    }

    // Exact column header match (case-insensitive)
    const exact = columns.find((c) => slugKey(c) === sk || c.toLowerCase() === rawKey.toLowerCase());
    if (exact) {
      cells[exact] = val;
      continue;
    }

    // Fill first empty column as last resort
    const emptyCol = columns.find((c) => !cells[c]?.trim());
    if (emptyCol) cells[emptyCol] = val;
  }

  return cells;
}

function parseSingleRow(
  raw: unknown,
  category: LifePulseCategoryId,
  columns: string[],
  index: number,
): PlanTableRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  let cells: Record<string, string> = {};

  if (row.cells && typeof row.cells === "object" && !Array.isArray(row.cells)) {
    cells = mapFlatRowToCells(row.cells as Record<string, unknown>, category, columns);
  } else {
    cells = mapFlatRowToCells(row, category, columns);
  }

  const hasContent = Object.values(cells).some((v) => v.trim().length > 0);
  if (!hasContent) return null;

  return {
    id: typeof row.id === "string" ? row.id : newTableRowId(),
    cells,
    label: typeof row.label === "string" ? row.label : undefined,
  };
}

/** True when at least one row has non-empty cell text. */
export function rowsHaveContent(rows: PlanTableRow[]): boolean {
  return rows.some((r) => Object.values(r.cells).some((v) => v.trim().length > 0));
}

/** Extract and normalize table rows from any Linos JSON shape. */
export function extractTableRowsFromAiPayload(
  raw: Record<string, unknown>,
  category: LifePulseCategoryId,
): PlanTableRow[] {
  const columns =
    Array.isArray(raw.table_columns) &&
    raw.table_columns.every((c) => typeof c === "string")
      ? (raw.table_columns as string[])
      : defaultTableColumns(category);

  const candidates: PlanTableRow[][] = [];

  function parseArray(arr: unknown[]): PlanTableRow[] {
    const parsed: PlanTableRow[] = [];
    for (let i = 0; i < arr.length; i++) {
      const row = parseSingleRow(arr[i], category, columns, i);
      if (row) parsed.push(row);
    }
    return parsed;
  }

  if (Array.isArray(raw.table_data)) candidates.push(parseArray(raw.table_data));
  if (Array.isArray(raw.table_rows)) candidates.push(parseArray(raw.table_rows));
  if (Array.isArray(raw.rows)) candidates.push(parseArray(raw.rows));

  for (const c of candidates) {
    if (rowsAreUsable(c)) return c;
  }

  return candidates.find((c) => c.length > 0) ?? [];
}

export function extractSummaryFromAiPayload(raw: Record<string, unknown>): string | null {
  for (const key of ["summary_text", "linos_intro", "description_markdown", "summary"]) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function rowsAreUsable(rows: PlanTableRow[]): boolean {
  return rows.length > 0 && rowsHaveContent(rows);
}
