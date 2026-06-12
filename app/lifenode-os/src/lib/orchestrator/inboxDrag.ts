import { INBOX_DRAG_MIME, type InboxDragPayload } from "./types";

export { INBOX_DRAG_MIME };

export function encodeInboxDrag(payload: InboxDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeInboxDrag(data: string): InboxDragPayload | null {
  try {
    const parsed = JSON.parse(data) as InboxDragPayload;
    if (parsed?.inboxItemId && typeof parsed.inboxItemId === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function readInboxDrag(e: {
  dataTransfer: DataTransfer;
}): InboxDragPayload | null {
  const raw =
    e.dataTransfer.getData(INBOX_DRAG_MIME) ||
    e.dataTransfer.getData("text/plain");
  if (!raw) return null;
  return decodeInboxDrag(raw);
}
