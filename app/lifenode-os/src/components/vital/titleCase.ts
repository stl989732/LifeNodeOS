/** Title Case for VitalNode card headings (lninstructions). */
export function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      if (w.length <= 3 && /^[a-z]+$/i.test(w)) {
        const lower = w.toLowerCase();
        if (["os", "ai", "hrv", "bpm", "spo2"].includes(lower)) return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Title Case each word; keeps punctuation (· & .). */
export function toTitleCaseWords(str: string): string {
  return str.replace(/[a-zA-Z0-9]+/g, (word) => {
    const lower = word.toLowerCase();
    if (["os", "ai", "hrv", "bpm", "spo2"].includes(lower)) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}
