/**
 * Namespace browser storage keys per signed-in user so accounts on the same
 * device do not inherit another user's node data.
 */
export function userScopedStorageKey(
  baseKey: string,
  userId: string | null | undefined,
): string {
  const id = userId?.trim();
  if (!id) return baseKey;
  return `${baseKey}::${id}`;
}

/**
 * Read localStorage with migrate-on-load when keys were renamed or user-scoped.
 *
 * Order: current key → (if scoped) unscoped base key → each legacy key in order.
 * On fallback hit, copies data forward to `storageKey` so the next load is fast.
 */
export function readScopedLocalStorage(
  storageKey: string,
  legacyKeys: string[] = [],
): string | null {
  if (typeof window === "undefined") return null;

  const current = window.localStorage.getItem(storageKey);
  if (current) return current;

  const candidates: string[] = [];
  if (storageKey.includes("::")) {
    const baseKey = storageKey.split("::")[0];
    if (baseKey) candidates.push(baseKey);
  }
  for (const key of legacyKeys) {
    if (key && key !== storageKey && !candidates.includes(key)) {
      candidates.push(key);
    }
  }

  for (const legacy of candidates) {
    const raw = window.localStorage.getItem(legacy);
    if (raw) {
      window.localStorage.setItem(storageKey, raw);
      return raw;
    }
  }
  return null;
}
