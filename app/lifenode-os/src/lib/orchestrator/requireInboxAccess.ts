import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { listUserIntegrations } from "@/src/lib/integrations/userIntegrationsDb";

export type InboxAccess =
  | { ok: true; sessionUserId: string; integrationUserId: string }
  | { ok: false; response: NextResponse };

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function forbidden(error: string, message: string) {
  return NextResponse.json({ error, message }, { status: 403 });
}

/**
 * Inbox is only available to signed-in users with an active Gmail or Slack OAuth
 * connection (tokens in user_integrations).
 */
export async function requireInboxAccess(
  session: Session | null,
): Promise<InboxAccess> {
  const sessionUserId = session?.user?.id?.trim();
  if (!sessionUserId) {
    return { ok: false, response: unauthorized() };
  }

  const integrationUserId = await resolveIntegrationUserId(session);
  if (!integrationUserId) {
    return {
      ok: false,
      response: forbidden(
        "ACCOUNT_LINK_FAILED",
        "Could not link your account for integrations.",
      ),
    };
  }

  const integrations = await listUserIntegrations(integrationUserId);
  const hasInboxProvider = integrations.some(
    (row) =>
      row.connected && (row.provider === "gmail" || row.provider === "slack"),
  );

  if (!hasInboxProvider) {
    return {
      ok: false,
      response: forbidden(
        "INBOX_NOT_CONNECTED",
        "Connect Gmail or Slack in Integrations to use the inbox.",
      ),
    };
  }

  return {
    ok: true,
    sessionUserId: String(sessionUserId),
    integrationUserId,
  };
}
