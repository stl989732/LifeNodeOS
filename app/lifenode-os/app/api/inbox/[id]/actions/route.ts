import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { archiveInboxItem, getInboxItem } from "@/src/lib/orchestrator/inboxDb";
import {
  archiveGmailMessage,
  insertGoogleCalendarBlock,
  sendGmailReply,
  sendSlackInboxReply,
} from "@/src/lib/orchestrator/writeback";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

/** POST — provider write-back: reply, archive, schedule to Google Calendar. */
export async function POST(request: Request, ctx: RouteCtx) {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const integrationUserId = await resolveIntegrationUserId(session);
  if (!integrationUserId) {
    return NextResponse.json({ error: "ACCOUNT_LINK_FAILED" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: {
    action?: "reply" | "archive" | "calendar_insert";
    text?: string;
    date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const item = await getInboxItem(String(sessionUserId), id);
  if (!item) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    if (body.action === "reply") {
      if (!body.text?.trim()) {
        return NextResponse.json({ error: "MISSING_TEXT" }, { status: 400 });
      }
      if (item.source === "gmail") {
        await sendGmailReply(
          integrationUserId,
          String(sessionUserId),
          id,
          body.text.trim(),
        );
      } else if (item.source === "slack") {
        await sendSlackInboxReply(
          integrationUserId,
          String(sessionUserId),
          id,
          body.text.trim(),
        );
      } else {
        return NextResponse.json({ error: "REPLY_NOT_SUPPORTED" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, action: "reply" });
    }

    if (body.action === "archive") {
      if (item.source === "gmail") {
        await archiveGmailMessage(integrationUserId, item.external_id);
      }
      await archiveInboxItem(String(sessionUserId), id);
      return NextResponse.json({ ok: true, action: "archive" });
    }

    if (body.action === "calendar_insert") {
      const date =
        body.date ?? new Date().toISOString().slice(0, 10);
      const eventId = await insertGoogleCalendarBlock(integrationUserId, {
        title: item.title,
        date,
        notes: [item.snippet, item.body].filter(Boolean).join("\n\n"),
      });
      return NextResponse.json({ ok: true, action: "calendar_insert", eventId });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "action_failed";
    console.error("POST /api/inbox/[id]/actions:", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
