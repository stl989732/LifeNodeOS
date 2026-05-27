/** Title Case for dashboard / overlay labels (handles hyphens and acronyms loosely). */
export function toTitleCase(input: string): string {
  const s = input.trim();
  if (!s) return s;
  return s
    .split(/\s+/)
    .map((word) => {
      const parts = word.split(/([-–—])/);
      return parts
        .map((p) => {
          if (p === "-" || p === "–" || p === "—") return p;
          if (!p) return p;
          if (p.length <= 3 && p === p.toUpperCase()) return p;
          return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
        })
        .join("");
    })
    .join(" ");
}
