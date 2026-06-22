/**
 * Export a trimmed segment of a video blob using MediaRecorder + captureStream.
 */
export async function trimVideoBlob(
  blob: Blob,
  startSec: number,
  endSec: number,
  mimeType: string,
): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("video load failed"));
  });

  const duration = video.duration;
  const start = Math.max(0, Math.min(startSec, duration - 0.1));
  const end = Math.max(start + 0.1, Math.min(endSec, duration));
  const clipDurationMs = (end - start) * 1000;

  const stream = (
    video as HTMLVideoElement & { captureStream?: () => MediaStream }
  ).captureStream?.();
  if (!stream) {
    URL.revokeObjectURL(url);
    throw new Error("captureStream not supported");
  }
  const recorderMime = MediaRecorder.isTypeSupported(mimeType)
    ? mimeType
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: recorderMime });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("trim record failed"));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorderMime }));
    };
  });

  video.currentTime = start;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  recorder.start(250);
  await video.play();

  await new Promise<void>((resolve) => {
    const check = () => {
      if (video.currentTime >= end || video.ended) {
        video.pause();
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  URL.revokeObjectURL(url);

  const result = await Promise.race([
    recorded,
    new Promise<Blob>((_, reject) =>
      setTimeout(() => reject(new Error("trim timeout")), clipDurationMs + 8000),
    ),
  ]);

  return result;
}
