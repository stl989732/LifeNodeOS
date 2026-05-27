import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { scoreLeadIntent, resolveTriageSourcePresentation } from "@/src/lib/bizNode/dealTriage";
import { fetchBizDealTriageRows } from "@/src/lib/bizNode/dealTriageServer";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

type TriageParse = {
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  intentSummary: string;
};

function mapUrgencyToColumn(urgency: string): string {
  const mapping: Record<string, string> = {
    LOW: "backlog",
    MEDIUM: "inbound_queue",
    HIGH: "needs_immediate_contact",
    CRITICAL: "hot_leads",
  };
  return mapping[urgency] ?? "inbound_queue";
}

function parseLead(leadName: string, rawNotes: string): TriageParse {
  const scored = scoreLeadIntent(rawNotes, leadName);
  const urgency: TriageParse["urgency"] =
    /\b(urgent|asap|critical|emergency|structural)\b/i.test(rawNotes)
      ? "CRITICAL"
      : scored.intent_level === "high"
        ? "HIGH"
        : scored.intent_level === "low"
          ? "LOW"
          : "MEDIUM";
  return { urgency, intentSummary: scored.intent_label };
}

/** GET — load deal-triage cards for the signed-in user. */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  try {
    const records = await fetchBizDealTriageRows(String(userId));
    return NextResponse.json({ records });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load triage feed";
    console.error("GET /api/triage:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — AI triage + persist to biz_deal_triage (v2 schema). */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) return unauthorized();

    const { leadName, rawNotes, userId: bodyUserId } = await request.json();

    if (!leadName?.trim() || !rawNotes?.trim()) {
      return NextResponse.json(
        { error: "Missing lead parameters." },
        { status: 400 },
      );
    }

    const parsedData = parseLead(leadName.trim(), rawNotes.trim());
    const userId = String(sessionUserId);
    const sourcePresentation = resolveTriageSourcePresentation(
      "MANUAL_INTAKE",
      rawNotes.trim(),
    );

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("biz_deal_triage")
      .insert({
        user_id: userId,
        node_owner: "BIZ",
        source_provider: "MANUAL_INTAKE",
        raw_notes_or_payload: rawNotes.trim(),
        kanban_column: mapUrgencyToColumn(parsedData.urgency),
        status: "triaged",
        metadata: {
          lead_name: leadName.trim(),
          ai_summary: parsedData.intentSummary,
          urgency_score: parsedData.urgency,
          detection_channel: sourcePresentation.channel,
          linos_action: sourcePresentation.actionHint,
        },
      })
      .select()
      .single();

    if (error) throw error;

    if (bodyUserId && String(bodyUserId) !== userId) {
      console.warn(
        "POST /api/triage: client userId did not match session; saved with session id.",
        { bodyUserId, sessionUserId: userId },
      );
    }

    return NextResponse.json({ success: true, record: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Triage Error";
    console.error("Triage workflow failure:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
