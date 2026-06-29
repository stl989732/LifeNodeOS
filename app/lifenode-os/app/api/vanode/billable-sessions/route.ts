import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { planHasBillableHours } from "@/src/lib/billing/planFeatureCopy";
import {
  normalizeBillableRow,
  type BillableSession,
} from "@/src/lib/vanode/billableHours";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function planDenied() {
  return NextResponse.json(
    { error: "PLAN_REQUIRED", message: "Billable hours requires Sync or Nexus." },
    { status: 403 },
  );
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const plan = await getUserPlan(userId);
  if (!planHasBillableHours(plan)) return planDenied();

  const url = new URL(req.url);
  const workDate = url.searchParams.get("date")?.slice(0, 10) ?? utcToday();
  const clientId = url.searchParams.get("clientId");

  try {
    const supabase = createSupabaseAdminClient();
    let q = supabase
      .from("vanode_billable_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("work_date", workDate)
      .order("created_at", { ascending: false });

    if (clientId) q = q.eq("client_id", clientId);

    const { data, error } = await q;
    if (error) {
      console.error("[vanode billable] list error", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const sessions = (data ?? []).map((row) =>
      normalizeBillableRow(row as Record<string, unknown>),
    );
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error("[vanode billable] list", e);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

type StartBody = {
  action: "start";
  clientId: string;
  clientName: string;
  workDate?: string;
};

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const plan = await getUserPlan(userId);
  if (!planHasBillableHours(plan)) return planDenied();

  let body: StartBody;
  try {
    body = (await req.json()) as StartBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "start" || !body.clientId?.trim()) {
    return NextResponse.json({ error: "Invalid start payload" }, { status: 400 });
  }

  const workDate = body.workDate?.slice(0, 10) ?? utcToday();
  const now = new Date().toISOString();
  const clientId = body.clientId.trim();
  const clientName = body.clientName?.trim() || "Client";

  try {
    const supabase = createSupabaseAdminClient();

    const { data: existing } = await supabase
      .from("vanode_billable_sessions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("client_id", clientId)
      .eq("work_date", workDate)
      .in("status", ["active", "break_15", "break_30", "break_60"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "ALREADY_ACTIVE", sessionId: existing.id },
        { status: 409 },
      );
    }

    const row = {
      user_id: userId,
      client_id: clientId,
      client_name: clientName,
      work_date: workDate,
      status: "active",
      started_at: now,
      event_log: [{ at: now, type: "start" }],
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("vanode_billable_sessions")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[vanode billable] start error", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      session: normalizeBillableRow(data as Record<string, unknown>),
    });
  } catch (e) {
    console.error("[vanode billable] start", e);
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
  }
}

export type { BillableSession };
