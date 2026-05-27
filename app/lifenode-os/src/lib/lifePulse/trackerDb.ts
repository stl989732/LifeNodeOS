import {
  CATEGORY_DEFAULT_METRICS,
  LIFE_PULSE_CATEGORIES,
  type CreateLifePulseTrackerInput,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePriorityForDb,
  normalizeStatusForDb,
} from "./trackerSchema";
import type { LifePulseCategoryId, LifePulseTracker } from "./types";

/** DB category label (e.g. Travel) from app id (e.g. travel). */
export function categoryForDb(category: LifePulseCategoryId): string {
  const match = LIFE_PULSE_CATEGORIES.find((c) => c.id === category);
  return match?.label ?? category;
}

/** App category id from DB value (label or legacy slug). */
export function categoryFromDb(raw: string): LifePulseCategoryId {
  const lower = raw.trim().toLowerCase();
  const byId = LIFE_PULSE_CATEGORIES.find((c) => c.id === lower.replace(/\s+/g, "_"));
  if (byId) return byId.id;
  const byLabel = LIFE_PULSE_CATEGORIES.find((c) => c.label.toLowerCase() === lower);
  if (byLabel) return byLabel.id;
  return "life";
}

export function buildTrackerInsertRow(
  input: CreateLifePulseTrackerInput,
  userId: string,
): Record<string, unknown> {
  const context =
    input.context_data ?? CATEGORY_DEFAULT_METRICS[input.category];
  const scheduleDate = input.due_date ?? input.start_date ?? null;

  return {
    user_id: userId,
    category: categoryForDb(input.category),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    planned_at: input.planned_at ?? new Date().toISOString(),
    parent_id: input.parent_id ?? null,
    progress_percent: Math.round(Number(input.progress_percent) || 0),
    start_date: input.start_date ?? null,
    /** Primary date column for paste / legacy schema */
    target_date: scheduleDate,
    /** Included for v2 schemas that renamed target_date → due_date */
    due_date: scheduleDate,
    priority: normalizePriorityForDb(input.priority),
    status: normalizeStatusForDb(input.status),
    context_data: context,
    metrics: context,
  };
}

type InsertResult = {
  data: Record<string, unknown> | null;
  error: { message: string; code?: string; details?: string; hint?: string } | null;
};

const MISSING_COLUMN_RE =
  /Could not find the '([^']+)' column|column ['"]([^'"]+)['"] does not exist/i;

function stripMissingColumn(
  row: Record<string, unknown>,
  message: string,
): Record<string, unknown> | null {
  const match = message.match(MISSING_COLUMN_RE);
  const col = match?.[1] ?? match?.[2];
  if (!col || !(col in row)) return null;
  const next = { ...row };
  delete next[col];
  return next;
}

function expandInsertVariants(
  baseRow: Record<string, unknown>,
  categoryId: LifePulseCategoryId,
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const variants: Record<string, unknown>[] = [];

  const push = (row: Record<string, unknown>) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(row);
  };

  const scheduleDate = baseRow.due_date ?? baseRow.target_date ?? null;
  const context = baseRow.context_data ?? baseRow.metrics;

  push(baseRow);

  const { due_date, context_data, metrics, ...core } = baseRow;
  push({
    ...core,
    target_date: scheduleDate,
    metrics: context,
  });

  push({
    ...core,
    target_date: scheduleDate,
    context_data: context,
  });

  push({
    user_id: baseRow.user_id,
    category: categoryId,
    title: baseRow.title,
    target_date: scheduleDate,
    status: baseRow.status,
    metrics: context,
  });

  push({
    user_id: baseRow.user_id,
    category: baseRow.category,
    title: baseRow.title,
    target_date: scheduleDate,
    status: baseRow.status,
    metrics: context,
  });

  return variants;
}

/** Inserts with schema fallbacks (target_date vs due_date, metrics vs context_data, etc.). */
export async function insertTrackerRow(
  supabase: SupabaseClient,
  baseRow: Record<string, unknown>,
  categoryId: LifePulseCategoryId,
): Promise<InsertResult> {
  const queue = expandInsertVariants(baseRow, categoryId);
  let lastError: InsertResult["error"] = null;

  while (queue.length > 0) {
    const row = queue.shift()!;
    const { data, error } = await supabase
      .from("lifenode_trackers")
      .insert(row)
      .select()
      .single();

    if (!error && data) {
      return { data: data as Record<string, unknown>, error: null };
    }

    lastError = {
      message: error?.message ?? "Insert failed",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    };

    const trimmed = stripMissingColumn(row, lastError.message);
    if (trimmed) queue.push(trimmed);
  }

  return { data: null, error: lastError };
}

export function normalizeTracker(row: Record<string, unknown>): LifePulseTracker {
  const context =
    (row.context_data as Record<string, unknown> | undefined) ??
    (row.metrics as Record<string, unknown> | undefined) ??
    {};

  const due =
    (row.due_date as string | null | undefined) ??
    (row.target_date as string | null | undefined) ??
    null;

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    category: categoryFromDb(String(row.category ?? "life")),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    planned_at: (row.planned_at as string | null) ?? null,
    parent_id: (row.parent_id as string | null) ?? null,
    progress_percent:
      row.progress_percent != null && row.progress_percent !== undefined
        ? Math.min(100, Math.max(0, Math.round(Number(row.progress_percent))))
        : null,
    start_date: (row.start_date as string | null) ?? null,
    due_date: due,
    target_date: (row.target_date as string | null) ?? null,
    priority: normalizePriorityForDb(String(row.priority ?? "Medium")),
    status: normalizeStatusForDb(String(row.status ?? "Planned")),
    context_data: context,
    metrics: row.metrics as Record<string, unknown> | undefined,
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}
