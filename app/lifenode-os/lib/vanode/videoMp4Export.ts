/** Pick a MediaRecorder MIME type for MP4 export (browser-dependent). */
export function pickMp4ExportMime(): string | null {
  const candidates = [
    "video/mp4;codecs=avc1,mp4a",
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return null;
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

/**
 * Re-encode a WebM (or other) capture to MP4 by playing it and recording
 * captureStream(). Real-time (1× duration) but works without ffmpeg.wasm.
 */
export async function remuxBlobToMp4(source: Blob): Promise<Blob> {
  if (source.type.includes("mp4")) return source;

  const mp4Mime = pickMp4ExportMime();
  if (!mp4Mime) {
    throw new Error("MP4 export is not supported in this browser.");
  }

  const url = URL.createObjectURL(source);
  const video = document.createElement("video");
  video.src = url;
  video.playsInline = true;
  video.muted = false;
  video.volume = 1;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not load capture for MP4 export."));
  });

  const capture = (
    video as HTMLVideoElement & { captureStream?: () => MediaStream }
  ).captureStream?.();
  if (!capture) {
    URL.revokeObjectURL(url);
    throw new Error("captureStream is not supported in this browser.");
  }

  const recorder = new MediaRecorder(capture, { mimeType: mp4Mime });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("MP4 export recording failed."));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mp4Mime }));
    };
  });

  const durationMs = Number.isFinite(video.duration)
    ? video.duration * 1000
    : 60_000;

  recorder.start(250);
  try {
    await video.play();
  } catch {
    URL.revokeObjectURL(url);
    capture.getTracks().forEach((t) => t.stop());
    throw new Error("Could not play capture for MP4 export — try WebM download.");
  }

  await new Promise<void>((resolve) => {
    video.onended = () => resolve();
    window.setTimeout(() => resolve(), durationMs + 1500);
  });

  if (recorder.state !== "inactive") {
    try {
      recorder.requestData();
    } catch {
      /* ignore */
    }
    recorder.stop();
  }

  capture.getTracks().forEach((t) => t.stop());
  URL.revokeObjectURL(url);

  return Promise.race([
    recorded,
    new Promise<Blob>((_, reject) =>
      window.setTimeout(
        () => reject(new Error("MP4 export timed out.")),
        durationMs + 15_000,
      ),
    ),
  ]);
}
