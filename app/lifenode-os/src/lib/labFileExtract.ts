/** Best-effort text extraction from uploaded lab files (PDF via pdf.js CDN not used — text files + filename hints). */

export async function extractTextFromLabFile(file: File): Promise<string> {
  const name = file.name;
  const type = file.type;

  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv")) {
    return await file.text();
  }

  if (type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(name)) {
    return `[Image attached: ${name}. For full OCR, paste key values from your lab report below or use your device's scan-to-text before upload.]`;
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return `[PDF attached: ${name}. Paste the numeric results and reference ranges into the text field for analysis, or re-export as text from your patient portal.]`;
  }

  return `[File attached: ${name}. Add pasted lab lines for detailed interpretation.]`;
}
