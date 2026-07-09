import fixWebmDuration from "fix-webm-duration";

function isWebmCapture(blob: Blob, mimeType: string): boolean {
  const type = (mimeType || blob.type || "").toLowerCase();
  return type.includes("webm");
}

/**
 * MediaRecorder WebM blobs often ship without Duration metadata, which makes
 * HTML5 progress bars jump (near 100% at start, backward on pause). Patch using
 * the wall-clock recording length we already track during capture.
 */
export async function fixCaptureBlobDuration(
  blob: Blob,
  durationSec: number,
  mimeType: string,
): Promise<Blob> {
  if (typeof window === "undefined" || !isWebmCapture(blob, mimeType)) {
    return blob;
  }
  const durationMs = Math.max(500, Math.round(durationSec * 1000));
  try {
    const fixed = await fixWebmDuration(blob, durationMs, { logger: false });
    return fixed.size > 0 ? fixed : blob;
  } catch {
    return blob;
  }
}
