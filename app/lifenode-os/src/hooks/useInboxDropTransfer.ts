"use client";

import { readInboxDrag } from "@/src/lib/orchestrator/inboxDrag";

/** POST /api/inbox/[id]/transfer when an inbox row is dropped on a shell target. */
export async function transferInboxDrop(
  e: React.DragEvent,
  body: Record<string, unknown>,
): Promise<boolean> {
  const drag = readInboxDrag(e);
  if (!drag?.inboxItemId) return false;

  const res = await fetch(`/api/inbox/${drag.inboxItemId}/transfer`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.ok;
}
