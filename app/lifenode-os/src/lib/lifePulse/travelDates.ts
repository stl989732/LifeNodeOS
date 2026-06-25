function parseDateOnly(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const isoDate = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed;
  const d = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inclusive trip length from departure through return (date-only, no times). */
export function parseTravelTripDays(answers?: Record<string, string>): number {
  if (!answers) return 0;

  const depRaw = answers.departure_date?.trim();
  const retRaw = answers.return_date?.trim();
  if (depRaw && retRaw) {
    const dep = parseDateOnly(depRaw);
    const ret = parseDateOnly(retRaw);
    if (!dep || !ret) return 0;
    const diffMs = ret.getTime() - dep.getTime();
    if (diffMs < 0) return 0;
    return Math.min(60, Math.max(1, Math.floor(diffMs / 86_400_000) + 1));
  }

  return 0;
}

export function formatTravelDateRange(answers?: Record<string, string>): string {
  if (!answers) return "";
  const dep = answers.departure_date?.trim();
  const ret = answers.return_date?.trim();
  if (dep && ret) {
    const depLabel = dep.includes("T") ? dep.slice(0, 10) : dep;
    const retLabel = ret.includes("T") ? ret.slice(0, 10) : ret;
    return `Travel dates: ${depLabel} → ${retLabel} (round trip). `;
  }
  const legacy = answers.travel_date?.trim();
  if (legacy) {
    const label = legacy.includes("T") ? legacy.slice(0, 10) : legacy;
    return `Travel date: ${label}. `;
  }
  return "";
}
