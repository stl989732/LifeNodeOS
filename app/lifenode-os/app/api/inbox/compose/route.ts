import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUserIntegrations } from "@/src/lib/integrations/userIntegrationsDb";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { sendGmailCompose } from "@/src/lib/orchestrator/writeback";

export const runtime = "nodejs";

function isValidRecipient(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return trimmed.split(",").every((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part.trim()));
}

/** POST — send a new Gmail message. */
export async function POST(request: Request) {
  const session = await auth();
  const sessionUserId = session?.user?.id?.trim();
  if (!sessionUserId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const integrationUserId = await resolveIntegrationUserId(session);
  if (!integrationUserId) {
    return NextResponse.json({ error: "ACCOUNT_LINK_FAILED" }, { status: 403 });
  }

  const integrations = await listUserIntegrations(integrationUserId);
  const gmailConnected = integrations.some(
    (row) => row.connected && row.provider === "gmail",
  );
  if (!gmailConnected) {
    return NextResponse.json(
      {
        error: "GMAIL_NOT_CONNECTED",
        message: "Connect Gmail in Integrations to compose email.",
      },
      { status: 403 },
    );
  }

  let body: { to?: string; subject?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const to = body.to?.trim() ?? "";
  const subject = body.subject?.trim() ?? "";
  const text = body.text?.trim() ?? "";

  if (!isValidRecipient(to)) {
    return NextResponse.json({ error: "INVALID_TO" }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ error: "MISSING_SUBJECT" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "MISSING_TEXT" }, { status: 400 });
  }

  try {
    await sendGmailCompose(integrationUserId, { to, subject, body: text });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "compose_failed";
    console.error("POST /api/inbox/compose:", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
