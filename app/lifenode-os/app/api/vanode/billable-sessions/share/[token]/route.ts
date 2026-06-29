import { NextResponse } from "next/server";
import {
  formatBillableDecimalHours,
  formatBillableHours,
  normalizeBillableRow,
} from "@/src/lib/vanode/billableHours";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public read-only billable hours summary for client share links. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("vanode_billable_sessions")
      .select(
        "client_name, work_date, status, accumulated_active_ms, accumulated_break_ms, started_at, ended_at, event_log",
      )
      .eq("share_token", token.trim())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = normalizeBillableRow(data as Record<string, unknown>);
    return NextResponse.json({
      clientName: session.clientName,
      workDate: session.workDate,
      status: session.status,
      activeTime: formatBillableHours(session.accumulatedActiveMs),
      activeHoursDecimal: formatBillableDecimalHours(session.accumulatedActiveMs),
      breakTime: formatBillableHours(session.accumulatedBreakMs),
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      immutable: true,
    });
  } catch (e) {
    console.error("[vanode billable share]", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
