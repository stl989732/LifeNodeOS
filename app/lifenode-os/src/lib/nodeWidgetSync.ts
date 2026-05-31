import { isNodeWidgetKey, type NodeWidgetKey } from "@/lib/node-widget-keys";

export { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function payloadHasData(payload: unknown): boolean {
  if (payload === null || payload === undefined) return false;
  if (typeof payload === "string") return payload.trim().length > 0;
  if (Array.isArray(payload)) return payload.length > 0;
  if (typeof payload === "object") return Object.keys(payload as object).length > 0;
  return true;
}

export async function fetchNodeWidgets(
  keys: NodeWidgetKey[],
): Promise<Record<string, unknown>> {
  if (typeof window === "undefined" || !keys.length) return {};
  try {
    const res = await fetch(
      `/api/node-data?keys=${encodeURIComponent(keys.join(","))}`,
      { cache: "no-store", credentials: "include" },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as {
      widgets?: Record<string, { payload?: unknown }>;
    };
    const out: Record<string, unknown> = {};
    for (const [key, row] of Object.entries(data.widgets ?? {})) {
      if (row && "payload" in row) out[key] = row.payload;
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveNodeWidgetNow(
  widgetKey: NodeWidgetKey,
  payload: unknown,
): Promise<boolean> {
  if (typeof window === "undefined" || !isNodeWidgetKey(widgetKey)) return false;
  try {
    const res = await fetch("/api/node-data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ widgetKey, payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Debounced PUT to Supabase; localStorage remains the instant cache in components. */
export function scheduleNodeWidgetSave(
  widgetKey: NodeWidgetKey,
  payload: unknown,
  debounceMs = 700,
): void {
  if (typeof window === "undefined" || !isNodeWidgetKey(widgetKey)) return;

  const existing = saveTimers.get(widgetKey);
  if (existing) clearTimeout(existing);

  saveTimers.set(
    widgetKey,
    setTimeout(() => {
      saveTimers.delete(widgetKey);
      void saveNodeWidgetNow(widgetKey, payload);
    }, debounceMs),
  );
}

/** After loading local state, merge server payloads (server wins when present). */
export async function hydrateWidgetsFromServer<T extends NodeWidgetKey>(
  keys: T[],
  localByKey: Partial<Record<T, unknown>>,
): Promise<Partial<Record<T, unknown>>> {
  const remote = await fetchNodeWidgets(keys);
  const merged: Partial<Record<T, unknown>> = { ...localByKey };

  for (const key of keys) {
    if (remote[key] !== undefined && payloadHasData(remote[key])) {
      merged[key] = remote[key];
    } else if (payloadHasData(localByKey[key])) {
      scheduleNodeWidgetSave(key, localByKey[key], 200);
    }
  }

  return merged;
}
