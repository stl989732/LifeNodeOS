/**
 * Screen captures: metadata syncs via Supabase widget + optional cloud blob upload;
 * local IndexedDB remains the fast on-device cache.
 */
import {
  fetchScreenCaptureBlobFromCloud,
  getScreenCaptureManifestKey,
  persistScreenCaptureManifest,
  uploadScreenCaptureToCloud,
  type ScreenCaptureRecord,
} from "./screenCaptureSync";

export type { ScreenCaptureRecord } from "./screenCaptureSync";

let captureUserScope: string | undefined;
let cloudSyncOptIn = false;

export function setScreenCaptureCloudSync(enabled: boolean) {
  cloudSyncOptIn = enabled;
}

export function setScreenCaptureUserScope(userId: string | undefined) {
  captureUserScope = userId?.trim() || undefined;
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

export function pickScreenRecorderMime(): { mimeType: string; ext: string } {
  const candidates = [
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) {
      return { mimeType: c.mime, ext: c.ext };
    }
  }
  return { mimeType: "video/webm", ext: "webm" };
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
  const id = crypto.randomUUID();
  const record: ScreenCaptureRecord = {
    id,
    filename: meta.filename,
    mimeType: meta.mimeType,
    createdAt: new Date().toISOString(),
    durationSec: meta.durationSec,
    includeMic: meta.includeMic,
    sizeBytes: blob.size,
    clientId: meta.clientId ?? null,
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(blob, id);
  });
  db.close();

  const next = [record, ...readManifest()];
  writeManifest(next);
  if (cloudSyncOptIn) {
    void uploadScreenCaptureToCloud(record, blob).then((ok) => {
      if (!ok) return;
      const synced = next.map((r) =>
        r.id === record.id ? { ...r, cloudSynced: true } : r,
      );
      writeManifest(synced);
    });
  }
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
