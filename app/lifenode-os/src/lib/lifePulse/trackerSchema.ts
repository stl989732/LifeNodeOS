/** Values enforced by Supabase `lifenode_trackers` CHECK constraints. */

export const TRACKER_STATUSES = [
  "Planned",
  "Active",
  "Waiting",
  "Blocked",
  "Overdue",
  "Completed",
  "Paused",
] as const;

export const TRACKER_PRIORITIES = ["Low", "Medium", "High"] as const;

export type TrackerStatus = (typeof TRACKER_STATUSES)[number];
export type TrackerPriority = (typeof TRACKER_PRIORITIES)[number];

const STATUS_LOOKUP = new Map(
  TRACKER_STATUSES.map((s) => [s.toLowerCase(), s] as const),
);

const PRIORITY_LOOKUP = new Map(
  TRACKER_PRIORITIES.map((p) => [p.toLowerCase(), p] as const),
);

/** Maps legacy / loose strings to a valid DB status (default Planned). */
export function normalizeStatusForDb(value?: string | null): TrackerStatus {
  if (!value?.trim()) return "Planned";
  const hit = STATUS_LOOKUP.get(value.trim().toLowerCase());
  if (hit) return hit;
  if (value === "completed") return "Completed";
  if (value === "active") return "Active";
  if (value === "paused") return "Paused";
  if (value === "cancelled") return "Paused";
  return "Planned";
}

/** Maps legacy / loose strings to a valid DB priority (default Medium). */
export function normalizePriorityForDb(value?: string | null): TrackerPriority {
  if (!value?.trim()) return "Medium";
  const hit = PRIORITY_LOOKUP.get(value.trim().toLowerCase());
  if (hit) return hit;
  return "Medium";
}

export function isTrackerCompleted(status: TrackerStatus): boolean {
  return status === "Completed";
}

export function countsTowardCalmAggregate(status: TrackerStatus): boolean {
  return status !== "Completed" && status !== "Paused";
}
