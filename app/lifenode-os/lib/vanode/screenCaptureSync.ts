import {
  NODE_WIDGET_KEYS,
  fetchNodeWidgetsWithMeta,
  readLocalWidgetUpdatedAt,
  resolveWidgetBootstrap,
  scheduleNodeWidgetSave,
  touchLocalWidgetUpdatedAt,
} from "@/src/lib/nodeWidgetSync";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import {
  SCREEN_CAPTURE_MAX_BYTES,
  screenCaptureTooLargeMessage,
} from "@/lib/vanode/screenCaptureLimits";

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

const BUCKET = "user-screen-captures";

/** Kept in sync with `setScreenCaptureUserScope` so share uploads update the right manifest. */
let syncUserScope: string | undefined;

export function bindScreenCaptureUserScope(userId: string | undefined) {
  syncUserScope = userId?.trim() || undefined;
}

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

function markLocalCloudSynced(id: string) {
  const storageKey = manifestStorageKey(syncUserScope);
  const rows = readLocalManifest(storageKey);
  if (rows.length === 0) return;
  const next = rows.map((row) =>
    row.id === id ? { ...row, cloudSynced: true } : row,
  );
  writeLocalManifest(storageKey, next);
  touchLocalWidgetUpdatedAt(storageKey);
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

async function uploadViaSignedUrl(
  record: ScreenCaptureRecord,
  blob: Blob,
): Promise<{ ok: true } | { ok: false; status?: number; error?: string }> {
  const prepareRes = await fetch("/api/vanode/screen-captures/prepare-upload", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: record.id,
      filename: record.filename,
      mimeType: record.mimeType,
      sizeBytes: blob.size || record.sizeBytes,
    }),
  });

  if (!prepareRes.ok) {
    let error = "PREPARE_FAILED";
    try {
      const json = (await prepareRes.json()) as { error?: string };
      if (json.error) error = json.error;
    } catch {
      /* ignore */
    }
    return { ok: false, status: prepareRes.status, error };
  }

  const prepared = (await prepareRes.json()) as {
    path: string;
    token: string;
    mimeType?: string;
  };

  const supabase = getSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(prepared.path, prepared.token, blob, {
      contentType: prepared.mimeType || record.mimeType || blob.type || "video/webm",
    });

  if (uploadError) {
    console.error("[screen-captures] signed upload failed:", uploadError);
    return { ok: false, error: "UPLOAD_FAILED" };
  }

  const completeRes = await fetch("/api/vanode/screen-captures/complete-upload", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: record.id,
      filename: record.filename,
      mimeType: record.mimeType,
      durationSec: record.durationSec,
      includeMic: record.includeMic,
      clientId: record.clientId ?? null,
      createdAt: record.createdAt,
      sizeBytes: blob.size || record.sizeBytes,
    }),
  });

  if (!completeRes.ok) {
    let error = "COMPLETE_FAILED";
    try {
      const json = (await completeRes.json()) as { error?: string };
      if (json.error) error = json.error;
    } catch {
      /* ignore */
    }
    return { ok: false, status: completeRes.status, error };
  }

  markLocalCloudSynced(record.id);
  return { ok: true };
}

/** Legacy FormData path — only viable for small files under the host body limit. */
async function uploadViaProxyForm(
  record: ScreenCaptureRecord,
  blob: Blob,
): Promise<boolean> {
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
  if (res.ok) markLocalCloudSynced(record.id);
  return res.ok;
}

export async function uploadScreenCaptureToCloud(
  record: ScreenCaptureRecord,
  blob: Blob,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const size = blob.size || record.sizeBytes || 0;
  if (size > SCREEN_CAPTURE_MAX_BYTES) return false;

  try {
    const signed = await uploadViaSignedUrl(record, blob);
    if (signed.ok) return true;
    // Fall back only for small files if signed upload is unavailable.
    if (size <= 4 * 1024 * 1024) {
      return uploadViaProxyForm(record, blob);
    }
    return false;
  } catch {
    return false;
  }
}

function shareLinkErrorMessage(
  status: number | undefined,
  code: string | undefined,
  sizeBytes: number,
): string {
  if (status === 413 || code === "FILE_TOO_LARGE") {
    return screenCaptureTooLargeMessage(sizeBytes);
  }
  if (status === 403 || code === "PLAN_REQUIRED") {
    return "Recording links are available on Sync and Nexus.";
  }
  if (code === "NOT_UPLOADED") {
    return "Upload finished incompletely — try Copy link again.";
  }
  return "Could not create a recording link. Check your connection and try again.";
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

  const sizeBytes = blob.size || record.sizeBytes || 0;
  if (sizeBytes > SCREEN_CAPTURE_MAX_BYTES) {
    throw new Error(screenCaptureTooLargeMessage(sizeBytes));
  }

  // Always ensure storage + widget row exist (cloudSynced flag alone can be stale).
  const uploaded = await uploadViaSignedUrl(record, blob);
  if (!uploaded.ok) {
    throw new Error(
      shareLinkErrorMessage(uploaded.status, uploaded.error, sizeBytes),
    );
  }

  const response = await fetch(
    `/api/vanode/screen-captures/${encodeURIComponent(record.id)}/share`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: record.filename,
        mimeType: record.mimeType,
        sizeBytes,
      }),
    },
  );
  if (!response.ok) {
    let code: string | undefined;
    try {
      const json = (await response.json()) as { error?: string };
      code = json.error;
    } catch {
      /* ignore */
    }
    throw new Error(shareLinkErrorMessage(response.status, code, sizeBytes));
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
