/**
 * Count hours in the next 24h wall-clock slice where both zones are in a
 * simple 09:00–17:59 “work window” (local hour).
 */
export function countOverlapHours(vaTz: string, clientTz: string): number {
  return overlapWorkHourFlags(vaTz, clientTz).filter(Boolean).length;
}

/** Next 24h — true when both zones are in 09:00–17:59 local work window. */
export function overlapWorkHourFlags(vaTz: string, clientTz: string): boolean[] {
  const flags: boolean[] = [];
  const start = Date.now();
  const work = (h: number) => h >= 9 && h <= 17;
  for (let i = 0; i < 24; i++) {
    const t = new Date(start + i * 3_600_000);
    const vaH = hourInZone(t, vaTz);
    const clH = hourInZone(t, clientTz);
    flags.push(work(vaH) && work(clH));
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
