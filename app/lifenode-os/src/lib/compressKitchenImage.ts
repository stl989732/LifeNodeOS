/** Client-side resize/compress before sending pantry photos to kitchen-ai. */
export async function compressKitchenImageFile(
  file: File,
  opts?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<{ base64: string; mimeType: string }> {
  const maxEdge = opts?.maxEdge ?? 1280;
  const quality = opts?.quality ?? 0.82;
  const maxBytes = opts?.maxBytes ?? 900_000;

  if (typeof window === "undefined") {
    throw new Error("compressKitchenImageFile requires a browser");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas not supported");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > maxBytes * 1.37 && q > 0.45) {
    q -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }

  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("Image compression failed");
  return { base64, mimeType: "image/jpeg" };
}
