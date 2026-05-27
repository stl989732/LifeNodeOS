/** Lightweight NLP for Quick Add — extracts due dates from free-text titles. */

export type QuickAddParseResult = {
  /** Full user text (title is never stripped). */
  title: string;
  due_date: string | null;
  /** Human-readable hint for UI, e.g. "Aug 30, 2026" */
  due_label: string | null;
};

const MONTH_MAP: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const MONTH_NAME =
  "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)";

function endOfDayIso(y: number, m: number, d: number): string {
  const dt = new Date(y, m, d, 23, 59, 59, 0);
  return dt.toISOString();
}

function formatDueLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveYear(
  explicitYear: number | undefined,
  month: number,
  day: number,
  ref: Date,
): number {
  if (explicitYear != null && explicitYear > 1900) {
    return explicitYear < 100 ? 2000 + explicitYear : explicitYear;
  }
  const candidate = new Date(ref.getFullYear(), month, day, 12);
  if (candidate < ref) return ref.getFullYear() + 1;
  return ref.getFullYear();
}

function tryNamedMonth(
  text: string,
  ref: Date,
): { iso: string; label: string } | null {
  const re = new RegExp(
    `\\b(?:on\\s+)?${MONTH_NAME}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?:\\s+of\\s+this\\s+year)?\\b`,
    "i",
  );
  const m = text.match(re);
  if (!m) return null;

  const monthKey = m[1].toLowerCase();
  const month = MONTH_MAP[monthKey];
  if (month == null) return null;

  const day = Number.parseInt(m[2], 10);
  if (day < 1 || day > 31) return null;

  const year = resolveYear(
    m[3] ? Number.parseInt(m[3], 10) : undefined,
    month,
    day,
    ref,
  );

  const iso = endOfDayIso(year, month, day);
  return { iso, label: formatDueLabel(iso) };
}

function tryNumericDate(text: string, ref: Date): { iso: string; label: string } | null {
  const m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (!m) return null;

  let month = Number.parseInt(m[1], 10) - 1;
  let day = Number.parseInt(m[2], 10);
  if (month > 11) {
    day = Number.parseInt(m[1], 10);
    month = Number.parseInt(m[2], 10) - 1;
  }
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  const year = resolveYear(
    m[3] ? Number.parseInt(m[3], 10) : undefined,
    month,
    day,
    ref,
  );
  const iso = endOfDayIso(year, month, day);
  return { iso, label: formatDueLabel(iso) };
}

function tryRelative(text: string, ref: Date): { iso: string; label: string } | null {
  const lower = text.toLowerCase();
  const addDays = (n: number) => {
    const d = new Date(ref);
    d.setDate(d.getDate() + n);
    const iso = endOfDayIso(d.getFullYear(), d.getMonth(), d.getDate());
    return { iso, label: formatDueLabel(iso) };
  };

  if (/\btomorrow\b/.test(lower)) return addDays(1);
  if (/\btoday\b/.test(lower)) return addDays(0);
  if (/\bnext\s+week\b/.test(lower)) return addDays(7);
  return null;
}

/**
 * Parses natural-language dates inside tracker text.
 * Title is always the full input string; due_date is extracted when possible.
 */
export function parseQuickAddTracker(
  raw: string,
  referenceDate: Date = new Date(),
): QuickAddParseResult {
  const title = raw.trim();
  if (!title) {
    return { title: "", due_date: null, due_label: null };
  }

  const hit =
    tryNamedMonth(title, referenceDate) ??
    tryNumericDate(title, referenceDate) ??
    tryRelative(title, referenceDate);

  if (!hit) {
    return { title, due_date: null, due_label: null };
  }

  return { title, due_date: hit.iso, due_label: hit.label };
}
