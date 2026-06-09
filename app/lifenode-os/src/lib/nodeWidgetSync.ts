import { isNodeWidgetKey, type NodeWidgetKey } from "@/lib/node-widget-keys";

export { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export type WidgetRemoteRow = {
  payload: unknown;
  updatedAt: string | null;
};

function localMetaKey(storageKey: string): string {
  return `${storageKey}::widget_updated_at`;
}

export function readLocalWidgetUpdatedAt(storageKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(localMetaKey(storageKey));
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function touchLocalWidgetUpdatedAt(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(localMetaKey(storageKey), new Date().toISOString());
  } catch {
    /* quota */
  }
}

export function payloadHasData(payload: unknown): boolean {
  if (payload === null || payload === undefined) return false;
  if (typeof payload === "string") return payload.trim().length > 0;
  if (Array.isArray(payload)) return payload.length > 0;
  if (typeof payload === "object") return Object.keys(payload as object).length > 0;
  return true;
}

function isRemoteNewer(
  remoteUpdatedAt: string | null,
  localUpdatedAt: string | null,
): boolean {
  if (!remoteUpdatedAt) return false;
  if (!localUpdatedAt) return true;
  return Date.parse(remoteUpdatedAt) > Date.parse(localUpdatedAt);
}

export type WidgetBootstrapResult<T> = {
  value: T;
  pushLocal: boolean;
};

/**
 * Pick server vs local widget payload using updatedAt timestamps.
 * Never pushes empty/default local state over existing server data.
 */
export function resolveWidgetBootstrap<T>(opts: {
  local: T;
  localUpdatedAt: string | null;
  remote: WidgetRemoteRow | undefined;
  parseRemote: (payload: unknown) => T;
  hasMeaningfulLocal: (value: T) => boolean;
  remoteHasData?: (payload: unknown) => boolean;
}): WidgetBootstrapResult<T> {
  const remoteHas = opts.remoteHasData ?? payloadHasData;
  const remotePayload = opts.remote?.payload;
  const remoteUpdatedAt = opts.remote?.updatedAt ?? null;
  const hasRemote = remotePayload !== undefined && remoteHas(remotePayload);
  const localMeaningful = opts.hasMeaningfulLocal(opts.local);

  if (hasRemote && isRemoteNewer(remoteUpdatedAt, opts.localUpdatedAt)) {
    return { value: opts.parseRemote(remotePayload), pushLocal: false };
  }

  if (localMeaningful) {
    const pushLocal =
      !hasRemote ||
      isRemoteNewer(opts.localUpdatedAt, remoteUpdatedAt);
    return { value: opts.local, pushLocal };
  }

  if (hasRemote) {
    return { value: opts.parseRemote(remotePayload), pushLocal: false };
  }

  return { value: opts.local, pushLocal: false };
}

export async function fetchNodeWidgets(
  keys: NodeWidgetKey[],
): Promise<Record<string, unknown>> {
  const withMeta = await fetchNodeWidgetsWithMeta(keys);
  const out: Record<string, unknown> = {};
  for (const [key, row] of Object.entries(withMeta)) {
    out[key] = row.payload;
  }
  return out;
}

export async function fetchNodeWidgetsWithMeta(
  keys: NodeWidgetKey[],
): Promise<Record<string, WidgetRemoteRow>> {
  if (typeof window === "undefined" || !keys.length) return {};
  try {
    const res = await fetch(
      `/api/node-data?keys=${encodeURIComponent(keys.join(","))}`,
      { cache: "no-store", credentials: "include" },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as {
      widgets?: Record<string, { payload?: unknown; updatedAt?: string }>;
    };
    const out: Record<string, WidgetRemoteRow> = {};
    for (const [key, row] of Object.entries(data.widgets ?? {})) {
      if (!row || !("payload" in row)) continue;
      out[key] = {
        payload: row.payload,
        updatedAt:
          typeof row.updatedAt === "string" ? row.updatedAt : null,
      };
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

/** After loading local state, merge server payloads (server wins when newer). */
export async function hydrateWidgetsFromServer<T extends NodeWidgetKey>(
  keys: T[],
  localByKey: Partial<Record<T, unknown>>,
  localUpdatedAtByKey: Partial<Record<T, string | null>> = {},
): Promise<Partial<Record<T, unknown>>> {
  const remote = await fetchNodeWidgetsWithMeta(keys);
  const merged: Partial<Record<T, unknown>> = { ...localByKey };

  for (const key of keys) {
    const local = localByKey[key];
    const localUpdatedAt = localUpdatedAtByKey[key] ?? null;
    const remoteRow = remote[key];
    const hasRemote =
      remoteRow?.payload !== undefined && payloadHasData(remoteRow.payload);

    if (hasRemote && isRemoteNewer(remoteRow.updatedAt, localUpdatedAt)) {
      merged[key] = remoteRow.payload;
    } else if (payloadHasData(local)) {
      scheduleNodeWidgetSave(key, local, 200);
    }
  }

  return merged;
}
