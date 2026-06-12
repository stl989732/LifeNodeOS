import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import {
  archiveInboxItem,
  getInboxItem,
  patchInboxItem,
  rowToClientItem,
} from "@/src/lib/orchestrator/inboxDb";
import { hydrateInboxBody } from "@/src/lib/orchestrator/writeback";
import type { InboxStatus } from "@/src/lib/orchestrator/types";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

type RouteCtx = { params: Promise<{ id: string }> };

/** GET — inbox item detail (optional body hydration from provider). */
export async function GET(_request: Request, ctx: RouteCtx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { id } = await ctx.params;

  try {
    const row = await getInboxItem(String(userId), id);
    if (!row) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    let body = row.body;
    if (!body?.trim()) {
      const integrationUserId = await resolveIntegrationUserId(session);
      if (integrationUserId) {
        body = await hydrateInboxBody(
          integrationUserId,
          row.source,
          row.external_id,
          row.body,
        );
        if (body && body !== row.body) {
          await patchInboxItem(String(userId), id, { body });
        }
      }
    }

    return NextResponse.json({
      item: rowToClientItem({ ...row, body }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "inbox_get_failed";
    console.error("GET /api/inbox/[id]:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH — local status, notes, transfer_meta. */
export async function PATCH(request: Request, ctx: RouteCtx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { id } = await ctx.params;

  let body: {
    status?: InboxStatus;
    localNotes?: string | null;
    transferMeta?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const row = await patchInboxItem(String(userId), id, {
      status: body.status,
      local_notes: body.localNotes,
      transfer_meta: body.transferMeta,
    });
    if (!row) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ item: rowToClientItem(row) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "inbox_patch_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — soft-archive in LifeNode (provider delete via /actions). */
export async function DELETE(_request: Request, ctx: RouteCtx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { id } = await ctx.params;

  try {
    const ok = await archiveInboxItem(String(userId), id);
    if (!ok) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "inbox_delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
