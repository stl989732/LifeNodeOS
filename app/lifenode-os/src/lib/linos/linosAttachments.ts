export const LINOS_FILE_INPUT_ACCEPT =
  "image/*,.pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** ~6 MB guard for client-read files before Gemini. */
export const LINOS_ATTACHMENT_MAX_BYTES = 6 * 1024 * 1024;

export type InlineGeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Strip data URL prefix → raw base64. */
export function dataUrlToBase64(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  return { mime: m[1], base64: m[2].replace(/\s/g, "") };
}

export async function readTextFileUtf8(file: File): Promise<string> {
  return file.text();
}

export function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "file";
}
