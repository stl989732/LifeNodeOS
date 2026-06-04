/** Parse "HH:MM" to minutes from midnight; returns null if invalid. */
export function parseTimeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function isHourInWorkWindow(
  hour: number,
  workStart = "09:00",
  workEnd = "17:00",
): boolean {
  const start = parseTimeToMinutes(workStart) ?? 9 * 60;
  const end = parseTimeToMinutes(workEnd) ?? 17 * 60;
  const h = hour * 60;
  if (start <= end) return h >= start && h < end;
  return h >= start || h < end;
}

export function overlapFlagsWithSchedule(
  vaTz: string,
  clientTz: string,
  vaStart: string,
  vaEnd: string,
  clientStart: string,
  clientEnd: string,
): boolean[] {
  const flags: boolean[] = [];
  const start = Date.now();
  for (let i = 0; i < 24; i++) {
    const t = new Date(start + i * 3_600_000);
    const vaH = hourInZone(t, vaTz);
    const clH = hourInZone(t, clientTz);
    flags.push(
      isHourInWorkWindow(vaH, vaStart, vaEnd) &&
        isHourInWorkWindow(clH, clientStart, clientEnd),
    );
  }
  return flags;
}

function hourInZone(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value;
  return Number.parseInt(h ?? "0", 10);
}

export const DEFAULT_WORK_START = "09:00";
export const DEFAULT_WORK_END = "17:00";
