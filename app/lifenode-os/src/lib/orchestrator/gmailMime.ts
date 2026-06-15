import { convert } from "html-to-text";

type GmailMimePart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMimePart[];
};

export type GmailExtractedBody = {
  plain: string | null;
  html: string | null;
};

export function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function collectMimeBodies(
  part: GmailMimePart | undefined,
  acc: { plain: string[]; html: string[] },
): void {
  if (!part) return;

  const mime = part.mimeType?.toLowerCase() ?? "";
  const data = part.body?.data;

  if (data && mime === "text/plain") {
    const text = decodeBase64Url(data).trim();
    if (text) acc.plain.push(text);
  } else if (data && mime === "text/html") {
    const html = decodeBase64Url(data).trim();
    if (html) acc.html.push(html);
  } else if (data && !part.parts?.length && mime.startsWith("text/")) {
    const text = decodeBase64Url(data).trim();
    if (text) acc.plain.push(text);
  }

  for (const child of part.parts ?? []) {
    collectMimeBodies(child, acc);
  }
}

export function extractMimeBodies(payload: GmailMimePart | undefined): GmailExtractedBody {
  if (!payload) return { plain: null, html: null };

  const acc = { plain: [] as string[], html: [] as string[] };

  if (payload.body?.data && !payload.parts?.length) {
    const raw = decodeBase64Url(payload.body.data).trim();
    const mime = payload.mimeType?.toLowerCase() ?? "";
    if (raw) {
      if (mime === "text/html") acc.html.push(raw);
      else acc.plain.push(raw);
    }
  }

  for (const part of payload.parts ?? []) {
    collectMimeBodies(part, acc);
  }

  const plain = acc.plain[0]?.slice(0, 12000) ?? null;
  const html = acc.html[0]?.slice(0, 200_000) ?? null;

  if (plain) return { plain, html };

  if (html) {
    return {
      plain: htmlToPlain(html).slice(0, 12000) || null,
      html,
    };
  }

  return { plain: null, html: null };
}

export function htmlToPlain(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "style", format: "skip" },
      { selector: "script", format: "skip" },
    ],
  })
    .replace(/\s+/g, " ")
    .trim();
}
