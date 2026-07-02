/** Parse YYYY-MM or YYYY-MM-DD into a noon-local anchor for month sync windows. */
export function parseMonthAnchor(monthKey?: string): Date {
  if (!monthKey?.trim()) return new Date();

  const trimmed = monthKey.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}-01T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  return new Date();
}

export function monthSyncWindow(monthKey?: string): { start: Date; end: Date } {
  const anchor = parseMonthAnchor(monthKey);
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m + 2, 0, 23, 59, 59);
  return { start, end };
}
