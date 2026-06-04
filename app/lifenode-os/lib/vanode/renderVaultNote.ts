export type VaultNotePart =
  | { type: "text"; text: string }
  | { type: "image"; alt: string; src: string };

const MD_IMAGE =
  /!\[([^\]]*)\]\((data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+)\)/g;

/** Split vault note body into readable text + inline images (whiteboard exports). */
export function parseVaultNoteParts(body: string): VaultNotePart[] {
  const parts: VaultNotePart[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MD_IMAGE.source, "g");
  while ((match = re.exec(body)) !== null) {
    const before = body.slice(last, match.index).trim();
    if (before) parts.push({ type: "text", text: stripRawBase64Lines(before) });
    parts.push({ type: "image", alt: match[1] || "Whiteboard sketch", src: match[2] });
    last = match.index + match[0].length;
  }
  const tail = body.slice(last).trim();
  if (tail) parts.push({ type: "text", text: stripRawBase64Lines(tail) });
  if (parts.length === 0 && body.trim()) {
    parts.push({ type: "text", text: stripRawBase64Lines(body) });
  }
  return parts;
}

function stripRawBase64Lines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.includes("data:image/png;base64,"))
    .join("\n")
    .trim();
}

export function vaultNoteHasImage(body: string): boolean {
  return MD_IMAGE.test(body);
}
