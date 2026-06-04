export function isTranscribableMeetingUrl(url: string) {
  const u = url.trim().toLowerCase();
  if (!u) return false;
  return (
    u.includes("loom.") ||
    u.includes("zoom.") ||
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("kommodo.ai")
  );
}
