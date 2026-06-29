import {
  countsTowardCalmAggregate,
  isTrackerCompleted,
  type TrackerPriority,
  type TrackerStatus,
} from "./trackerSchema";
import {
  type CreateLifePulseTrackerInput,
  type LifePulseCategoryId,
  type LifePulseTracker,
} from "./types";

export { normalizeTracker } from "./trackerDb";

function metricsFromTracker(tracker: LifePulseTracker): Record<string, unknown> {
  return tracker.context_data ?? tracker.metrics ?? {};
}

async function parseApiError(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    details?: unknown;
    hint?: string;
  };
  const parts = [body.message, body.error, body.hint].filter(Boolean);
  const msg = parts.length ? parts.join(" — ") : `Request failed (${res.status})`;
  const err = new Error(msg);
  (err as Error & { code?: string }).code = body.error;
  console.error("LifePulse API error:", body.details ?? body);
  return err;
}

/** Progress for Calm State ring — prefers DB `progress_percent`, falls back to context heuristics. */
export function trackerCompletionPercent(tracker: LifePulseTracker): number {
  if (isTrackerCompleted(tracker.status)) return 100;

  if (tracker.progress_percent != null && !Number.isNaN(tracker.progress_percent)) {
    return Math.min(100, Math.max(0, Math.round(tracker.progress_percent)));
  }

  const m = metricsFromTracker(tracker);

  switch (tracker.category) {
    case "skincare": {
      let n = 0;
      let d = 0;
      if (m.morning) {
        d += 1;
        if (m.morning_done) n += 1;
      }
      if (m.night) {
        d += 1;
        if (m.night_done) n += 1;
      }
      return d ? Math.round((n / d) * 100) : 0;
    }
    case "travel": {
      const list = Array.isArray(m.packing_list) ? (m.packing_list as string[]) : [];
      const packed = (m.packed ?? {}) as Record<string, boolean>;
      if (!list.length) return 0;
      const done = list.filter((item) => packed[item]).length;
      return Math.round((done / list.length) * 100);
    }
    case "events": {
      const list = Array.isArray(m.checklist) ? (m.checklist as string[]) : [];
      const checked = (m.checked ?? {}) as Record<string, boolean>;
      if (!list.length) return 0;
      const done = list.filter((item) => checked[item]).length;
      return Math.round((done / list.length) * 100);
    }
    case "business_goals": {
      const target = Number(m.kpi_target) || 0;
      const current = Number(m.current_revenue) || 0;
      if (!target) return 0;
      return Math.min(100, Math.round((current / target) * 100));
    }
    case "social_media": {
      const planned = Number(m.posts_planned) || 0;
      const done = Number(m.posts_done) || 0;
      if (!planned) return 0;
      return Math.min(100, Math.round((done / planned) * 100));
    }
    case "project_management": {
      const tableRows = Array.isArray(m.table_rows) ? m.table_rows : [];
      if (tableRows.length > 0) {
        let filled = 0;
        let done = 0;
        for (const r of tableRows) {
          const row = r as { cells?: Record<string, string> };
          const cells = row.cells ?? {};
          const task = (cells.Task ?? cells.Item ?? "").trim();
          if (!task) continue;
          filled += 1;
          const status = (cells.Status ?? "").toLowerCase();
          if (/done|complete|finished/i.test(status)) done += 1;
        }
        if (filled > 0) return Math.min(100, Math.round((done / filled) * 100));
      }
      const total = Number(m.tasks_total) || 0;
      const doneLegacy = Number(m.tasks_done) || 0;
      if (!total) return 0;
      return Math.min(100, Math.round((doneLegacy / total) * 100));
    }
    case "study": {
      const target = Number(m.hours_target) || 0;
      const done = Number(m.hours_done) || 0;
      if (!target) return 0;
      return Math.min(100, Math.round((done / target) * 100));
    }
    case "life": {
      const habits = Array.isArray(m.habits) ? (m.habits as string[]) : [];
      const habitDone = (m.habit_done ?? {}) as Record<string, boolean>;
      if (!habits.length) return 0;
      const n = habits.filter((h) => habitDone[h]).length;
      return Math.round((n / habits.length) * 100);
    }
    case "pets":
      return m.pet_name && m.vaccine_due ? 70 : m.pet_name ? 40 : 0;
    default:
      return 0;
  }
}

export async function fetchLifePulseTrackers(
  userId: string,
): Promise<LifePulseTracker[]> {
  void userId;
  const res = await fetch("/api/life-pulse/trackers", { credentials: "include" });
  if (!res.ok) throw await parseApiError(res);
  const json = (await res.json()) as { trackers: LifePulseTracker[] };
  return json.trackers ?? [];
}

export type LinosPlanBlueprintPayload = {
  title: string;
  summary_text: string;
  linos_intro: string;
  due_date_iso: string | null;
  table_columns: string[];
  table_data: { id: string; cells: Record<string, string>; label?: string }[];
};

export class LinosChatError extends Error {
  usage?: import("./linosUsageLimit").LinosUsageStatus;

  constructor(message: string, usage?: import("./linosUsageLimit").LinosUsageStatus) {
    super(message);
    this.name = "LinosChatError";
    this.usage = usage;
  }
}

export async function postLinosChat(input: {
  phase: "intake" | "breakdown";
  rawPrompt: string;
  categoryHint?: LifePulseCategoryId;
  domain?: LifePulseCategoryId;
  qualifyingAnswers?: Record<string, string>;
}) {
  const res = await fetch("/api/life-pulse/linos-chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    usage?: import("./linosUsageLimit").LinosUsageStatus;
  };
  if (!res.ok) {
    throw new LinosChatError(body.error ?? `Chat failed (${res.status})`, body.usage);
  }
  return body;
}

export async function generateLifePulseTracker(input: {
  rawPrompt: string;
  category: LifePulseCategoryId;
  due_date?: string | null;
  qualifyingAnswers?: Record<string, string>;
  planBlueprint?: LinosPlanBlueprintPayload;
}): Promise<LifePulseTracker> {
  const res = await fetch("/api/life-pulse/generate-tracker", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rawPrompt: input.rawPrompt,
      category: input.category,
      due_date: input.due_date,
      qualifyingAnswers: input.qualifyingAnswers,
      planBlueprint: input.planBlueprint,
    }),
  });
  if (!res.ok) throw await parseApiError(res);
  const json = (await res.json()) as { tracker: LifePulseTracker; notificationsCreated?: number };
  if (json.notificationsCreated && json.notificationsCreated > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications:changed"));
  }
  return json.tracker;
}

export async function createLifePulseTracker(
  input: CreateLifePulseTrackerInput,
): Promise<LifePulseTracker> {
  const res = await fetch("/api/life-pulse/trackers", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseApiError(res);
  const json = (await res.json()) as { tracker: LifePulseTracker };
  return json.tracker;
}

export async function updateLifePulseTracker(
  id: string,
  patch: {
    title?: string;
    status?: TrackerStatus | string;
    context_data?: Record<string, unknown>;
    metrics?: Record<string, unknown>;
    due_date?: string | null;
    start_date?: string | null;
    progress_percent?: number;
    priority?: TrackerPriority | string;
    parent_id?: string | null;
  },
): Promise<LifePulseTracker> {
  const res = await fetch(`/api/life-pulse/trackers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw await parseApiError(res);
  const json = (await res.json()) as { tracker: LifePulseTracker };
  return json.tracker;
}

export async function deleteLifePulseTracker(id: string): Promise<void> {
  const res = await fetch(`/api/life-pulse/trackers/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await parseApiError(res);
}

export function aggregateCalmCompletion(trackers: LifePulseTracker[]): number {
  const active = trackers.filter((t) => countsTowardCalmAggregate(t.status));
  if (!active.length) return 0;
  const sum = active.reduce((acc, t) => acc + trackerCompletionPercent(t), 0);
  return Math.round(sum / active.length);
}
