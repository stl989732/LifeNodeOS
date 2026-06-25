/** Strip markdown heading hashes from Linos user-facing copy. */
export function sanitizeLinosMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s#{1,6}\s+/g, " ")
    .replace(/\s#{1,6}(?=\S)/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
