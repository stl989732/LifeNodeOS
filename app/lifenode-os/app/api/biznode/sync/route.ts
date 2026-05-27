import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mapGhlContactToLead, fetchGhlContacts } from "@/src/lib/bizNode/ghlContacts";
import { resolveTriageSourcePresentation } from "@/src/lib/bizNode/dealTriage";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { getValidAccessToken } from "@/src/lib/integrations/tokenManager";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** GET — Sync GoHighLevel CRM contacts into biz_deal_triage for the signed-in user. */
export async function GET() {
  const session = await auth();
  const nextAuthUserId = session?.user?.id;
  if (!nextAuthUserId) return unauthorized();

  const integrationUserId = await resolveIntegrationUserId(session);
  if (!integrationUserId) {
    return NextResponse.json(
      { error: "ACCOUNT_LINK_FAILED", message: "Could not resolve integration account." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await getValidAccessToken(integrationUserId, "gohighlevel");
    const contacts = await fetchGhlContacts(accessToken);
    const leads = contacts
      .map((c) => mapGhlContactToLead(c))
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const supabase = createSupabaseAdminClient();

    await supabase
      .from("biz_deal_triage")
      .delete()
      .eq("user_id", String(nextAuthUserId))
      .eq("source_provider", "GOHIGHLEVEL");

    if (leads.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const crmSource = resolveTriageSourcePresentation("GOHIGHLEVEL");
    const rows = leads.map((lead) => {
      const urgency =
        lead.intent_level === "high"
          ? "HIGH"
          : lead.intent_level === "low"
            ? "LOW"
            : "MEDIUM";
      return {
        user_id: String(nextAuthUserId),
        node_owner: "BIZ",
        source_provider: "GOHIGHLEVEL",
        raw_notes_or_payload: lead.intake_notes,
        kanban_column: "inbound_queue",
        status: "triaged",
        metadata: {
          lead_name: lead.lead_name,
          ai_summary: lead.intent_label,
          urgency_score: urgency,
          detection_channel: crmSource.channel,
          linos_action: crmSource.actionHint,
        },
      };
    });

    const { error } = await supabase.from("biz_deal_triage").insert(rows);
    if (error) {
      console.error("biz_deal_triage insert:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    console.error("GET /api/biznode/sync:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
