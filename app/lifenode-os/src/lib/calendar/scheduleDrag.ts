export const SCHEDULE_DRAG_MIME = "application/x-lifenode-schedule-item";

export type ScheduleDragPayload = {
  itemId: string;
  sourceProvider?: string;
};

export function encodeScheduleDrag(payload: ScheduleDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeScheduleDrag(data: string): ScheduleDragPayload | null {
  try {
    const parsed = JSON.parse(data) as ScheduleDragPayload;
    if (parsed?.itemId && typeof parsed.itemId === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function readScheduleDrag(e: {
  dataTransfer: DataTransfer;
}): ScheduleDragPayload | null {
  const raw =
    e.dataTransfer.getData(SCHEDULE_DRAG_MIME) ||
    e.dataTransfer.getData("text/plain");
  if (!raw) return null;
  return decodeScheduleDrag(raw);
}
