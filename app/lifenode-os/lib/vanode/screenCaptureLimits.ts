/** Max screen-capture upload size (matches Supabase bucket `file_size_limit`). */
export const SCREEN_CAPTURE_MAX_BYTES = 250 * 1024 * 1024;

export function screenCaptureTooLargeMessage(sizeBytes: number): string {
  const mb = (sizeBytes / (1024 * 1024)).toFixed(1);
  return `This recording is ${mb} MB — share links support up to 250 MB. Try a shorter capture.`;
}
