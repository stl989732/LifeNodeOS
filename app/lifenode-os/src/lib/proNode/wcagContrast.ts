/**
 * WCAG 2.x contrast ratio for sRGB hex pairs (relative luminance).
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (![3, 6].includes(normalized.length)) return null;
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function linearChannel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = linearChannel(rgb.r);
  const g = linearChannel(rgb.g);
  const b = linearChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colors (order-independent). */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const La = relativeLuminance(hexA);
  const Lb = relativeLuminance(hexB);
  if (La == null || Lb == null) return null;
  const lighter = Math.max(La, Lb);
  const darker = Math.min(La, Lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA normal text requires ≥ 4.5:1 when white (#fff) is foreground on `backgroundHex`. */
export function whiteTextFailsWcagAaOnBackground(backgroundHex: string): boolean {
  const ratio = contrastRatio("#FFFFFF", backgroundHex);
  if (ratio == null) return false;
  return ratio < 4.5;
}

const HEX_RE = /#([0-9a-f]{6})\b/gi;

export function extractHexCodes(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(HEX_RE)) {
    const h = `#${m[1]}`.toUpperCase();
    if (!seen.has(h)) {
      seen.add(h);
      out.push(h);
    }
  }
  return out;
}
