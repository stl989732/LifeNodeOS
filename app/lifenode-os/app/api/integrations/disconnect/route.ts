import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { providerIdToDbName } from "@/src/lib/integrations/providerDbName";
import type { IntegrationProviderId } from "@/src/lib/integrations/types";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

const KNOWN: IntegrationProviderId[] = [
  "hubspot",
  "google_calendar",
  "google_drive",
  "gmail",
  "salesforce",
  "pipedrive",
  "slack",
  "zoom",
  "gohighlevel",
];

/** POST — revoke stored tokens and mark connected app cards disconnected. */
export async function POST(request: Request) {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const integrationUserId = await resolveIntegrationUserId(session);
  if (!integrationUserId) {
    return NextResponse.json({ error: "ACCOUNT_LINK_FAILED" }, { status: 403 });
  }

  let body: { provider?: string; node?: string; appId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const provider = body.provider as IntegrationProviderId | undefined;
  if (!provider || !KNOWN.includes(provider)) {
    return NextResponse.json({ error: "INVALID_PROVIDER" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const providerName = providerIdToDbName(provider);

  const { error: intError } = await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", integrationUserId)
    .eq("provider_name", providerName);

  if (intError) {
    console.error("disconnect user_integrations:", intError);
    return NextResponse.json({ error: intError.message }, { status: 500 });
  }

  if (body.appId && body.node) {
    await supabase
      .from("user_connected_apps")
      .update({
        connection_status: "disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", String(sessionUserId))
      .eq("target_node", body.node.toUpperCase())
      .eq("app_id", body.appId);
  }

  return NextResponse.json({ ok: true, provider });
}
