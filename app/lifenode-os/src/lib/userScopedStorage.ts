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

/**
 * Copy all `baseKey::legacyUserId` localStorage entries to `baseKey::userId`
 * after OAuth ↔ credential account linking (common on mobile re-sign-in).
 */
export function migrateLegacyUserScopedKeys(
  userId: string,
  legacyUserId: string,
): void {
  if (typeof window === "undefined") return;
  const canonical = userId.trim();
  const legacy = legacyUserId.trim();
  if (!canonical || !legacy || canonical === legacy) return;

  const legacySuffix = `::${legacy}`;
  const canonicalSuffix = `::${canonical}`;
  const keysToMigrate: string[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.endsWith(legacySuffix)) keysToMigrate.push(key);
  }

  for (const key of keysToMigrate) {
    const base = key.slice(0, -legacySuffix.length);
    const targetKey = `${base}${canonicalSuffix}`;
    if (window.localStorage.getItem(targetKey)) continue;
    const value = window.localStorage.getItem(key);
    if (value) window.localStorage.setItem(targetKey, value);
  }
}
