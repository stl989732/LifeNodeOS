import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listInboxItems, rowToClientItem } from "@/src/lib/orchestrator/inboxDb";
import type { InboxSource, InboxStatus } from "@/src/lib/orchestrator/types";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** GET — list unified inbox items for the signed-in user. */
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const url = new URL(request.url);
  const source = url.searchParams.get("source") as InboxSource | null;
  const status = url.searchParams.get("status") as InboxStatus | null;
  const limit = Number(url.searchParams.get("limit") ?? "100");
  const cursor = url.searchParams.get("cursor") ?? undefined;

  try {
    const rows = await listInboxItems(String(userId), {
      source: source ?? undefined,
      status: status ?? undefined,
      limit: Number.isFinite(limit) ? Math.min(limit, 200) : 100,
      cursor,
    });

    return NextResponse.json({
      items: rows.map(rowToClientItem),
      count: rows.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "inbox_list_failed";
    console.error("GET /api/inbox:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
