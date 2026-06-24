import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listInboxItems, rowToClientItem } from "@/src/lib/orchestrator/inboxDb";
import { requireInboxAccess } from "@/src/lib/orchestrator/requireInboxAccess";
import { syncAllInboxProviders } from "@/src/lib/orchestrator/syncAll";
import type { InboxSource } from "@/src/lib/orchestrator/types";

export const runtime = "nodejs";

type SyncBody = {
  sources?: InboxSource[];
};

/** POST — pull Gmail, Slack, and Google Calendar into inbox_items. */
export async function POST(request: Request) {
  const session = await auth();
  const access = await requireInboxAccess(session);
  if (!access.ok) return access.response;
  const { sessionUserId, integrationUserId } = access;

  let body: SyncBody = {};
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    body = {};
  }

  try {
    const syncResult = await syncAllInboxProviders({
      integrationUserId,
      sessionUserId: String(sessionUserId),
      sources: body.sources,
    });

    const items = await listInboxItems(String(sessionUserId), { limit: 150 });

    return NextResponse.json({
      ok: true,
      ...syncResult,
      items: items.map(rowToClientItem),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "inbox_sync_failed";
    console.error("POST /api/inbox/sync:", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
