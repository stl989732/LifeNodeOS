import {
  NODE_WIDGET_KEYS,
  fetchNodeWidgetsWithMeta,
  readLocalWidgetUpdatedAt,
  resolveWidgetBootstrap,
  scheduleNodeWidgetSave,
  touchLocalWidgetUpdatedAt,
} from "@/src/lib/nodeWidgetSync";

export type ScreenCaptureRecord = {
  id: string;
  filename: string;
  mimeType: string;
  createdAt: string;
  durationSec: number;
  includeMic: boolean;
  sizeBytes: number;
  clientId?: string | null;
  cloudSynced?: boolean;
};

function manifestStorageKey(userScope: string | undefined): string {
  const base = "lifenode.vanode.screen-captures.v1";
  return userScope ? `${base}::${userScope}` : base;
}

function readLocalManifest(storageKey: string): ScreenCaptureRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ScreenCaptureRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalManifest(storageKey: string, rows: ScreenCaptureRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(rows.slice(0, 24)));
}

function parseManifestPayload(payload: unknown): ScreenCaptureRecord[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter(
    (row): row is ScreenCaptureRecord =>
      Boolean(row) &&
      typeof row === "object" &&
      typeof (row as ScreenCaptureRecord).id === "string",
  );
}

function hasMeaningfulManifest(rows: ScreenCaptureRecord[]): boolean {
  return rows.length > 0;
}

function mergeManifests(
  local: ScreenCaptureRecord[],
  remote: ScreenCaptureRecord[],
): ScreenCaptureRecord[] {
  const byId = new Map<string, ScreenCaptureRecord>();
  for (const row of remote) byId.set(row.id, row);
  for (const row of local) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    const localTs = Date.parse(row.createdAt);
    const remoteTs = Date.parse(existing.createdAt);
    byId.set(row.id, localTs >= remoteTs ? row : existing);
  }
  return Array.from(byId.values())
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 24);
}

export function getScreenCaptureManifestKey(userScope: string | undefined): string {
  return manifestStorageKey(userScope);
}

export async function hydrateScreenCaptureManifestFromServer(
  userScope?: string,
): Promise<ScreenCaptureRecord[]> {
  if (typeof window === "undefined") return [];

  const storageKey = manifestStorageKey(userScope);
  const local = readLocalManifest(storageKey);
  const remoteRows = await fetchNodeWidgetsWithMeta([
    NODE_WIDGET_KEYS.vanode.screenCaptures,
  ]);
  const { value, pushLocal } = resolveWidgetBootstrap({
    local,
    localUpdatedAt: readLocalWidgetUpdatedAt(storageKey),
    remote: remoteRows[NODE_WIDGET_KEYS.vanode.screenCaptures],
    parseRemote: parseManifestPayload,
    hasMeaningfulLocal: hasMeaningfulManifest,
    remoteHasData: (payload) => hasMeaningfulManifest(parseManifestPayload(payload)),
  });

  const merged = mergeManifests(local, value);
  writeLocalManifest(storageKey, merged);
  if (pushLocal && hasMeaningfulManifest(merged)) {
    scheduleNodeWidgetSave(NODE_WIDGET_KEYS.vanode.screenCaptures, merged, 300);
  }
  return merged;
}

export function persistScreenCaptureManifest(
  userScope: string | undefined,
  rows: ScreenCaptureRecord[],
): void {
  const storageKey = manifestStorageKey(userScope);
  writeLocalManifest(storageKey, rows);
  touchLocalWidgetUpdatedAt(storageKey);
  scheduleNodeWidgetSave(NODE_WIDGET_KEYS.vanode.screenCaptures, rows, 400);
}

export async function uploadScreenCaptureToCloud(
  record: ScreenCaptureRecord,
  blob: Blob,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const form = new FormData();
    form.append("file", blob, record.filename);
    form.append(
      "meta",
      JSON.stringify({
        id: record.id,
        filename: record.filename,
        mimeType: record.mimeType,
        durationSec: record.durationSec,
        includeMic: record.includeMic,
        clientId: record.clientId ?? null,
        createdAt: record.createdAt,
        sizeBytes: record.sizeBytes,
      }),
    );
    const res = await fetch("/api/vanode/screen-captures", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Explicitly uploads a capture (if needed) and creates a private, expiring
 * client link. This is separate from the cloud-sync opt-in: clicking Copy link
 * is the user's affirmative choice to upload this specific recording.
 */
export async function createScreenCaptureShareLink(
  record: ScreenCaptureRecord,
  blob: Blob,
): Promise<{ url: string; expiresAt: string }> {
  if (typeof window === "undefined") {
    throw new Error("Share links are only available in the browser.");
  }

  if (!record.cloudSynced) {
    const uploaded = await uploadScreenCaptureToCloud(record, blob);
    if (!uploaded) {
      throw new Error("Could not upload this recording for sharing.");
    }
  }

  const response = await fetch(
    `/api/vanode/screen-captures/${encodeURIComponent(record.id)}/share`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "Recording links are available on Sync and Nexus."
        : "Could not create a recording link.",
    );
  }
  return (await response.json()) as { url: string; expiresAt: string };
}

export async function fetchScreenCaptureBlobFromCloud(
  id: string,
): Promise<Blob | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`/api/vanode/screen-captures/${encodeURIComponent(id)}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}
