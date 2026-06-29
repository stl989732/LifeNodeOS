import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { planHasBillableHours } from "@/src/lib/billing/planFeatureCopy";
import {
  BREAK_MINUTES,
  liveActiveMs,
  normalizeBillableRow,
  statusForBreak,
  type BillableBreakKind,
  type BillableEvent,
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

type PatchBody =
  | { action: "break"; minutes: BillableBreakKind }
  | { action: "resume" }
  | { action: "end" }
  | { action: "share_link" };

function appendEvent(log: BillableEvent[], event: BillableEvent): BillableEvent[] {
  return [...log, event];
}

function closeActiveSegment(
  session: BillableSession,
  now: Date,
): { accumulatedActiveMs: number; accumulatedBreakMs: number } {
  let activeMs = session.accumulatedActiveMs;
  let breakMs = session.accumulatedBreakMs;

  if (session.status === "active" && session.startedAt) {
    const segmentStart = session.breakEndsAt
      ? new Date(session.breakEndsAt).getTime()
      : new Date(session.startedAt).getTime();
    if (now.getTime() > segmentStart) {
      activeMs += now.getTime() - segmentStart;
    }
  }

  if (
    (session.status === "break_15" ||
      session.status === "break_30" ||
      session.status === "break_60") &&
    session.breakStartedAt
  ) {
    const bStart = new Date(session.breakStartedAt).getTime();
    const bEnd = session.breakEndsAt
      ? new Date(session.breakEndsAt).getTime()
      : now.getTime();
    breakMs += Math.max(0, bEnd - bStart);
  }

  return { accumulatedActiveMs: activeMs, accumulatedBreakMs: breakMs };
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const plan = await getUserPlan(userId);
  if (!planHasBillableHours(plan)) return planDenied();

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: row, error: fetchErr } = await supabase
      .from("vanode_billable_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const current = normalizeBillableRow(row as Record<string, unknown>);
    if (current.status === "ended") {
      return NextResponse.json(
        { error: "SESSION_ENDED", message: "This session is closed and cannot be edited." },
        { status: 409 },
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const totals = closeActiveSegment(current, now);
    let patch: Record<string, unknown> = {
      updated_at: nowIso,
      accumulated_active_ms: totals.accumulatedActiveMs,
      accumulated_break_ms: totals.accumulatedBreakMs,
    };
    let eventLog = current.eventLog;

    if (body.action === "break") {
      if (current.status !== "active") {
        return NextResponse.json({ error: "Not active" }, { status: 400 });
      }
      const mins = BREAK_MINUTES[body.minutes];
      const breakEnds = new Date(now.getTime() + mins * 60_000);
      eventLog = appendEvent(eventLog, {
        at: nowIso,
        type: "break",
        minutes: body.minutes,
      });
      patch = {
        ...patch,
        status: statusForBreak(body.minutes),
        break_started_at: nowIso,
        break_ends_at: breakEnds.toISOString(),
        event_log: eventLog,
      };
    } else if (body.action === "resume") {
      const onBreak = ["break_15", "break_30", "break_60"].includes(current.status);
      if (!onBreak) {
        return NextResponse.json({ error: "Not on break" }, { status: 400 });
      }
      eventLog = appendEvent(eventLog, { at: nowIso, type: "resume" });
      patch = {
        ...patch,
        status: "active",
        break_started_at: null,
        break_ends_at: nowIso,
        event_log: eventLog,
      };
    } else if (body.action === "end") {
      eventLog = appendEvent(eventLog, { at: nowIso, type: "end" });
      const finalActive = totals.accumulatedActiveMs;
      patch = {
        ...patch,
        status: "ended",
        ended_at: nowIso,
        break_started_at: null,
        break_ends_at: null,
        accumulated_active_ms: finalActive,
        event_log: eventLog,
      };
    } else if (body.action === "share_link") {
      const token =
        current.shareToken ?? randomBytes(24).toString("base64url");
      eventLog = appendEvent(eventLog, { at: nowIso, type: "share_link" });
      patch = {
        ...patch,
        share_token: token,
        share_token_created_at: current.shareTokenCreatedAt ?? nowIso,
        event_log: eventLog,
      };
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const { data: updated, error: updErr } = await supabase
      .from("vanode_billable_sessions")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updErr) {
      console.error("[vanode billable] patch error", updErr);
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    const next = normalizeBillableRow(updated as Record<string, unknown>);
    return NextResponse.json({
      session: next,
      activeHours: liveActiveMs(next) / 3_600_000,
      shareUrl: next.shareToken
        ? `/vanode/time/${next.shareToken}`
        : undefined,
    });
  } catch (e) {
    console.error("[vanode billable] patch", e);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
