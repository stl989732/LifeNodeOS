/**
 * Screen captures: metadata syncs via Supabase widget + optional cloud blob upload;
 * local IndexedDB remains the fast on-device cache.
 */
import {
  bindScreenCaptureUserScope,
  fetchScreenCaptureBlobFromCloud,
  getScreenCaptureManifestKey,
  persistScreenCaptureManifest,
  uploadScreenCaptureToCloud,
  type ScreenCaptureRecord,
} from "./screenCaptureSync";
import { fixCaptureBlobDuration } from "./fixCaptureBlobDuration";

export type { ScreenCaptureRecord } from "./screenCaptureSync";

let captureUserScope: string | undefined;
let cloudSyncOptIn = false;

export function setScreenCaptureCloudSync(enabled: boolean) {
  cloudSyncOptIn = enabled;
}

export function setScreenCaptureUserScope(userId: string | undefined) {
  captureUserScope = userId?.trim() || undefined;
  bindScreenCaptureUserScope(captureUserScope);
}

function manifestKey() {
  return getScreenCaptureManifestKey(captureUserScope);
}

function dbName() {
  const base = "lifenode-vanode-screen-captures";
  return captureUserScope ? `${base}::${captureUserScope}` : base;
}

const DB_VERSION = 1;
const STORE = "videos";

/** In-progress backup while MediaRecorder is running (survives abrupt tab/share stop). */
export const RECORDING_DRAFT_ID = "__lifenode-recording-draft__";

const DRAFT_META_SESSION_KEY = "lifenode.vanode.recording-draft-meta";

export type RecordingDraftMeta = {
  mimeType: string;
  durationSec: number;
  includeMic: boolean;
  clientId?: string | null;
  updatedAt: string;
};

function readManifest(): ScreenCaptureRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(manifestKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ScreenCaptureRecord[]) : [];
  } catch {
    return [];
  }
}

function writeManifest(rows: ScreenCaptureRecord[]) {
  persistScreenCaptureManifest(captureUserScope, rows);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName(), DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export function pickScreenRecorderMime(
  hasAudio = true,
): { mimeType: string; ext: string } {
  const withAudio = [
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/mp4;codecs=avc1,mp4a", ext: "mp4" },
    { mime: "video/webm", ext: "webm" },
  ];
  const videoOnly = [
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
    { mime: "video/mp4", ext: "mp4" },
  ];
  const candidates = hasAudio ? withAudio : videoOnly;
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) {
      return { mimeType: c.mime, ext: c.ext };
    }
  }
  return { mimeType: "video/webm", ext: "webm" };
}

/** Ensure blob has a browser-playable MIME (fixes silent / broken preview). */
export function normalizeCaptureBlob(blob: Blob, mimeType: string): Blob {
  const type =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : mimeType || "video/webm";
  return blob.type === type ? blob : new Blob([blob], { type });
}

export async function persistRecordingDraft(
  blob: Blob,
  meta: Omit<RecordingDraftMeta, "updatedAt">,
): Promise<void> {
  if (typeof window === "undefined" || blob.size < 512) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(blob, RECORDING_DRAFT_ID);
  });
  db.close();
  try {
    sessionStorage.setItem(
      DRAFT_META_SESSION_KEY,
      JSON.stringify({
        ...meta,
        updatedAt: new Date().toISOString(),
      } satisfies RecordingDraftMeta),
    );
  } catch {
    /* ignore */
  }
}

export async function loadRecordingDraft(): Promise<{
  blob: Blob;
  meta: RecordingDraftMeta;
} | null> {
  if (typeof window === "undefined") return null;
  let meta: RecordingDraftMeta | null = null;
  try {
    const raw = sessionStorage.getItem(DRAFT_META_SESSION_KEY);
    if (raw) meta = JSON.parse(raw) as RecordingDraftMeta;
  } catch {
    meta = null;
  }
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(STORE).get(RECORDING_DRAFT_ID);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!blob || blob.size < 512 || !meta) return null;
  return { blob, meta };
}

export async function clearRecordingDraft(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DRAFT_META_SESSION_KEY);
  } catch {
    /* ignore */
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(RECORDING_DRAFT_ID);
  });
  db.close();
}

export async function saveScreenCapture(
  blob: Blob,
  meta: {
    filename: string;
    mimeType: string;
    durationSec: number;
    includeMic: boolean;
    clientId?: string | null;
  },
): Promise<ScreenCaptureRecord> {
  const storeBlob = await fixCaptureBlobDuration(
    blob,
    meta.durationSec,
    meta.mimeType,
  );
  const id = crypto.randomUUID();
  const record: ScreenCaptureRecord = {
    id,
    filename: meta.filename,
    mimeType: meta.mimeType,
    createdAt: new Date().toISOString(),
    durationSec: meta.durationSec,
    includeMic: meta.includeMic,
    sizeBytes: storeBlob.size,
    clientId: meta.clientId ?? null,
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(storeBlob, id);
  });
  db.close();

  const next = [record, ...readManifest()];
  writeManifest(next);
  if (cloudSyncOptIn) {
    void uploadScreenCaptureToCloud(record, storeBlob).then((ok) => {
      if (!ok) return;
      const synced = next.map((r) =>
        r.id === record.id ? { ...r, cloudSynced: true } : r,
      );
      writeManifest(synced);
    });
  }
  void clearRecordingDraft();
  return record;
}

export async function listScreenCaptures(): Promise<ScreenCaptureRecord[]> {
  return readManifest();
}

export async function getScreenCaptureBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const localBlob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (localBlob) return localBlob;
  return fetchScreenCaptureBlobFromCloud(id);
}

export async function deleteScreenCapture(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
  db.close();
  writeManifest(readManifest().filter((r) => r.id !== id));
}

export function renameScreenCapture(
  id: string,
  requestedName: string,
): ScreenCaptureRecord | null {
  const rows = readManifest();
  const current = rows.find((row) => row.id === id);
  if (!current) return null;

  const currentExtension =
    current.filename.match(/\.(webm|mp4)$/i)?.[0].toLowerCase() ??
    (current.mimeType.includes("mp4") ? ".mp4" : ".webm");
  const safeBase = requestedName
    .trim()
    .replace(/\.(webm|mp4)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[.\s-]+$/g, "")
    .slice(0, 120);
  if (!safeBase) return null;

  const renamed = { ...current, filename: `${safeBase}${currentExtension}` };
  writeManifest(rows.map((row) => (row.id === id ? renamed : row)));
  return renamed;
}

export function downloadScreenCapture(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function shareScreenCapture(
  blob: Blob,
  filename: string,
): Promise<"shared" | "downloaded" | "unsupported" | "failed" | "cancelled"> {
  if (typeof navigator === "undefined" || !navigator.share) {
    downloadScreenCapture(blob, filename);
    return "downloaded";
  }
  try {
    const file = new File([blob], filename, { type: blob.type || "video/webm" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "LifeNode OS screen capture",
      });
      return "shared";
    }
    const url = URL.createObjectURL(blob);
    try {
      await navigator.share({ title: filename, text: filename, url });
      return "shared";
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    downloadScreenCapture(blob, filename);
    return "downloaded";
  }
}

export function formatCaptureSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
