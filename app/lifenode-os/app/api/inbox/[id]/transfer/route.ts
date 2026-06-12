import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { executeInboxTransfer } from "@/src/lib/orchestrator/transfer";
import type { InboxTransferTarget } from "@/src/lib/orchestrator/types";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

function parseTarget(body: Record<string, unknown>): InboxTransferTarget {
  const type = body.type;
  if (type === "today") return { type: "today" };
  if (type === "backlog") return { type: "backlog" };
  if (type === "date" && typeof body.date === "string") {
    return { type: "date", date: body.date };
  }
  if (type === "node" && typeof body.node === "string") {
    const node = body.node as "biz" | "va" | "home";
    if (node === "biz" || node === "va" || node === "home") {
      return { type: "node", node };
    }
  }
  throw new Error("invalid_transfer_body");
}

/** POST — transfer inbox item to calendar, kanban, or a node. */
export async function POST(request: Request, ctx: RouteCtx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const target = parseTarget(body);
    const result = await executeInboxTransfer(String(userId), id, target);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "transfer_failed";
    const status = message === "inbox_item_not_found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
