export type VitalHealthMetricRow = {
  id: string;
  user_id: string;
  metric_date: string;
  sleep_score: number | null;
  readiness_score: number | null;
  active_calories: number | null;
  hrv: number | null;
  raw_json_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type VitalHealthMetricInput = {
  metric_date: string;
  sleep_score?: number | null;
  readiness_score?: number | null;
  active_calories?: number | null;
  hrv?: number | null;
  raw_json_payload?: Record<string, unknown>;
};
