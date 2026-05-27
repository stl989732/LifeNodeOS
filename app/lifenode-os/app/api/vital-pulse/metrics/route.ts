import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildMetricUpsertRow, normalizeMetricRow } from "@/src/lib/vitalPulse/metricsDb";
import type { VitalHealthMetricInput } from "@/src/lib/vitalPulse/types";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** GET — Authenticated user's vital metrics, newest `metric_date` first. */
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) return unauthorized();

  const url = new URL(request.url);
  const limit = Math.min(90, Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30));

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("vital_health_metrics")
      .select(
        "id, user_id, metric_date, sleep_score, readiness_score, active_calories, hrv, raw_json_payload, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("metric_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("vital_health_metrics fetch:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const metrics = (data ?? []).map((row) =>
      normalizeMetricRow(row as Record<string, unknown>),
    );

    return NextResponse.json({
      metrics,
      count: metrics.length,
      latest: metrics[0] ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("GET /api/vital-pulse/metrics:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — Upsert a daily vital metrics row (unique per user + metric_date). */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const input = body as VitalHealthMetricInput;
  if (!input.metric_date?.trim()) {
    return NextResponse.json({ error: "METRIC_DATE_REQUIRED" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const row = buildMetricUpsertRow(userId, input);
    const { data, error } = await supabase
      .from("vital_health_metrics")
      .upsert(row, { onConflict: "user_id,metric_date" })
      .select()
      .single();

    if (error || !data) {
      console.error("vital_health_metrics upsert:", error);
      return NextResponse.json(
        { error: error?.message ?? "UPSERT_FAILED" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      metric: normalizeMetricRow(data as Record<string, unknown>),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("POST /api/vital-pulse/metrics:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
