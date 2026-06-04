import type { EodLog, Invoice, Note, WaitingTask } from "./types";

/** When a workspace client is locked, only that client's linked rows are visible. */
export function scopeByActiveClient<T extends { clientId: string | null }>(
  rows: T[],
  activeClientId: string | null,
): T[] {
  if (!activeClientId) return rows;
  return rows.filter((r) => r.clientId === activeClientId);
}

export function scopeNotes(notes: Note[], activeClientId: string | null) {
  return scopeByActiveClient(notes, activeClientId);
}

export function scopeEodLogs(logs: EodLog[], activeClientId: string | null) {
  return scopeByActiveClient(logs, activeClientId);
}

export function scopeInvoices(invoices: Invoice[], activeClientId: string | null) {
  return scopeByActiveClient(invoices, activeClientId);
}

export function scopeWaitingTasks(
  tasks: WaitingTask[],
  activeClientId: string | null,
) {
  return scopeByActiveClient(tasks, activeClientId);
}

/** Force new rows onto the active workspace client when lock mode is on. */
export function resolveClientIdForWrite(
  activeClientId: string | null,
  requested: string | null,
): string | null {
  if (activeClientId) return activeClientId;
  return requested;
}
