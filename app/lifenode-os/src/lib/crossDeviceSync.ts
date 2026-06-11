import { listAllNodeWidgetKeys } from "@/lib/all-node-widget-keys";
import type { NodeWidgetKey } from "@/lib/node-widget-keys";
import {
  fetchNodeWidgetsWithMeta,
  payloadHasData,
  readLocalWidgetUpdatedAt,
  resolveWidgetBootstrap,
  saveNodeWidgetNow,
  touchLocalWidgetUpdatedAt,
} from "@/src/lib/nodeWidgetSync";
import {
  readBridgedWidgetLocal,
  WIDGET_LOCAL_STORAGE_BRIDGES,
  writeBridgedWidgetLocal,
} from "@/src/lib/widgetLocalStorageBridge";

export const CLOUD_SYNC_COMPLETE_EVENT = "lifenode:cloud-sync:complete";

export type PersistenceBootstrap = {
  userId: string;
  legacyUserId: string | null;
};

/** Server-side legacy id merge + canonical persistence user id. */
export async function bootstrapPersistenceSession(): Promise<PersistenceBootstrap | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/user-state/bootstrap", {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PersistenceBootstrap;
    if (!data?.userId?.trim()) return null;
    return {
      userId: data.userId.trim(),
      legacyUserId: data.legacyUserId?.trim() || null,
    };
  } catch {
    return null;
  }
}

/**
 * Push device-local widget cache to Supabase when newer, pull server rows into
 * localStorage when the cloud copy wins. Safe to run on every sign-in.
 */
export async function syncCrossDeviceWidgets(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId.trim()) return;

  const canonical = userId.trim();
  const keys = listAllNodeWidgetKeys();
  const remote = await fetchNodeWidgetsWithMeta(keys);

  await Promise.all(
    keys.map(async (widgetKey) => {
      const bridge = WIDGET_LOCAL_STORAGE_BRIDGES[widgetKey];
      if (!bridge?.storageKey) return;

      const storageKey = bridge.storageKey(canonical);
      if (!storageKey) return;

      const local = readBridgedWidgetLocal(canonical, widgetKey);
      const localUpdatedAt = readLocalWidgetUpdatedAt(storageKey);
      const remoteRow = remote[widgetKey];

      const { value, pushLocal } = resolveWidgetBootstrap({
        local,
        localUpdatedAt,
        remote: remoteRow,
        parseRemote: bridge.parseRemote ?? ((payload) => payload),
        hasMeaningfulLocal:
          bridge.hasMeaningfulLocal ?? ((v) => payloadHasData(v)),
      });

      if (pushLocal && payloadHasData(value)) {
        await saveNodeWidgetNow(widgetKey, value);
        touchLocalWidgetUpdatedAt(storageKey);
        return;
      }

      if (payloadHasData(value)) {
        writeBridgedWidgetLocal(canonical, widgetKey, value);
        const remoteUpdatedAt = remoteRow?.updatedAt;
        if (remoteUpdatedAt) {
          try {
            window.localStorage.setItem(
              `${storageKey}::widget_updated_at`,
              remoteUpdatedAt,
            );
          } catch {
            touchLocalWidgetUpdatedAt(storageKey);
          }
        } else {
          touchLocalWidgetUpdatedAt(storageKey);
        }
      }
    }),
  );

  window.dispatchEvent(
    new CustomEvent(CLOUD_SYNC_COMPLETE_EVENT, {
      detail: { userId: canonical },
    }),
  );
}

export function isCloudSyncWidgetKey(key: string): key is NodeWidgetKey {
  return key in WIDGET_LOCAL_STORAGE_BRIDGES;
}
