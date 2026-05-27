import type { VitalHealthMetricInput, VitalHealthMetricRow } from "./types";

function toIntOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function normalizeMetricRow(row: Record<string, unknown>): VitalHealthMetricRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    metric_date: String(row.metric_date ?? ""),
    sleep_score: toIntOrNull(row.sleep_score),
    readiness_score: toIntOrNull(row.readiness_score),
    active_calories: toIntOrNull(row.active_calories),
    hrv: toIntOrNull(row.hrv),
    raw_json_payload:
      row.raw_json_payload && typeof row.raw_json_payload === "object"
        ? (row.raw_json_payload as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function buildMetricUpsertRow(
  userId: string,
  input: VitalHealthMetricInput,
): Record<string, unknown> {
  const metricDate = input.metric_date?.trim();
  if (!metricDate) {
    throw new Error("metric_date is required");
  }

  return {
    user_id: userId,
    metric_date: metricDate,
    sleep_score: toIntOrNull(input.sleep_score),
    readiness_score: toIntOrNull(input.readiness_score),
    active_calories: toIntOrNull(input.active_calories),
    hrv: toIntOrNull(input.hrv),
    raw_json_payload: input.raw_json_payload ?? {},
    updated_at: new Date().toISOString(),
  };
}
