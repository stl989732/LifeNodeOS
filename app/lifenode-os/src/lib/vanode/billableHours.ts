export type BillableSessionStatus =
  | "idle"
  | "active"
  | "break_15"
  | "break_30"
  | "break_60"
  | "ended";

export type BillableBreakKind = "15" | "30" | "60";

export type BillableEvent =
  | { at: string; type: "start" }
  | { at: string; type: "break"; minutes: BillableBreakKind }
  | { at: string; type: "resume" }
  | { at: string; type: "end" }
  | { at: string; type: "share_link" };

export type BillableSession = {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  workDate: string;
  status: BillableSessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  breakStartedAt: string | null;
  breakEndsAt: string | null;
  accumulatedActiveMs: number;
  accumulatedBreakMs: number;
  eventLog: BillableEvent[];
  shareToken: string | null;
  shareTokenCreatedAt: string | null;
  vaultNoteId: string | null;
  createdAt: string;
  updatedAt: string;
};

export const BREAK_MINUTES: Record<BillableBreakKind, number> = {
  "15": 15,
  "30": 30,
  "60": 60,
};

export function breakKindFromStatus(
  status: BillableSessionStatus,
): BillableBreakKind | null {
  if (status === "break_15") return "15";
  if (status === "break_30") return "30";
  if (status === "break_60") return "60";
  return null;
}

export function statusForBreak(minutes: BillableBreakKind): BillableSessionStatus {
  if (minutes === "15") return "break_15";
  if (minutes === "30") return "break_30";
  return "break_60";
}

export function liveActiveMs(session: BillableSession, now = Date.now()): number {
  let ms = session.accumulatedActiveMs;
  if (session.status === "active" && session.startedAt) {
    const segmentStart = session.breakEndsAt
      ? new Date(session.breakEndsAt).getTime()
      : new Date(session.startedAt).getTime();
    if (now > segmentStart) ms += now - segmentStart;
  }
  return ms;
}

export function liveBreakRemainingMs(
  session: BillableSession,
  now = Date.now(),
): number {
  if (!session.breakEndsAt) return 0;
  const end = new Date(session.breakEndsAt).getTime();
  return Math.max(0, end - now);
}

export function formatBillableHours(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h === 0) return `${m}m ${s}s`;
  return `${h}h ${m}m ${s}s`;
}

/** Break countdown — always shows minutes and seconds (and hours when needed). */
export function formatBillableCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function formatBillableDecimalHours(ms: number): string {
  return (ms / 3_600_000).toFixed(2);
}

export function normalizeBillableRow(row: Record<string, unknown>): BillableSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    clientId: String(row.client_id),
    clientName: String(row.client_name ?? "Client"),
    workDate: String(row.work_date).slice(0, 10),
    status: String(row.status) as BillableSessionStatus,
    startedAt: row.started_at ? String(row.started_at) : null,
    endedAt: row.ended_at ? String(row.ended_at) : null,
    breakStartedAt: row.break_started_at ? String(row.break_started_at) : null,
    breakEndsAt: row.break_ends_at ? String(row.break_ends_at) : null,
    accumulatedActiveMs: Number(row.accumulated_active_ms ?? 0),
    accumulatedBreakMs: Number(row.accumulated_break_ms ?? 0),
    eventLog: Array.isArray(row.event_log)
      ? (row.event_log as BillableEvent[])
      : [],
    shareToken: row.share_token ? String(row.share_token) : null,
    shareTokenCreatedAt: row.share_token_created_at
      ? String(row.share_token_created_at)
      : null,
    vaultNoteId: row.vault_note_id ? String(row.vault_note_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function vaultNoteBodyForSession(session: BillableSession): string {
  const hours = formatBillableDecimalHours(session.accumulatedActiveMs);
  const lines = [
    `Billable time log · ${session.clientName}`,
    `Date: ${session.workDate}`,
    `Active time: ${formatBillableHours(session.accumulatedActiveMs)} (${hours} hrs)`,
    `Break time: ${formatBillableHours(session.accumulatedBreakMs)}`,
    "",
    "Event log (immutable):",
    ...session.eventLog.map((e) => {
      const at = new Date(e.at).toLocaleString();
      if (e.type === "break") return `- ${at}: ${e.minutes} min break`;
      return `- ${at}: ${e.type}`;
    }),
  ];
  return lines.join("\n");
}
