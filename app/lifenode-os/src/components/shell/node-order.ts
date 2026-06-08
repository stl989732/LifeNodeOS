/** Far-left sidebar hat order (Hub removed; Calendar first). */
export const SIDEBAR_HAT_ORDER = [
  "calendar",
  "pulse",
  "work",
  "va",
  "home",
  "vital",
  "pro",
  "trader",
] as const;

/** Node Gallery / LifeNode Dashboard card order (left → right). */
export const GALLERY_NODE_ORDER = [
  "BizNode",
  "VANode",
  "HomeNode",
  "VitalNode",
  "ProNode",
  "TraderNode",
] as const;

export function sortBySidebarHatOrder<T extends { id: string }>(items: T[]): T[] {
  const rank = new Map<string, number>(
    SIDEBAR_HAT_ORDER.map((id, i) => [id, i]),
  );
  return [...items].sort(
    (a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99),
  );
}
