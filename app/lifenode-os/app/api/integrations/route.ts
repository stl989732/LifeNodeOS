import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { listUserIntegrations } from "@/src/lib/integrations/userIntegrationsDb";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** GET — connected integration providers for the signed-in user. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const userId = await resolveIntegrationUserId(session);
  if (!userId) return unauthorized();

  try {
    const integrations = await listUserIntegrations(userId);
    return NextResponse.json({ integrations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("GET /api/integrations:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
