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
 * Unscoped localStorage keys that were used before per-user namespacing.
 * Drained into `baseKey::userId` once on login, then removed from the device.
 */
export const USER_SCOPED_STORAGE_BASE_KEYS = [
  "lifenode.homenode.setup.v1",
  "lifenode.homenode.notes.v1",
  "lifenode.homenode.saved-notes.v1",
  "lifenode.homenode.budget-rows.v1",
  "lifenode.homenode.chore-rows.v1",
  "lifenode.homenode.activity-prep.v1",
  "lifenode.homenode.kitchen-ai.v1",
  "lifenode.homenode.upcoming-engagement.v1",
  "lifenode.homenode.recipe-vault.v1",
  "lifenode.homenode.native-grocery.v1",
  "lifenode.homenode.child-name.v1",
  "lifenode.homenode.kitchen.setup.v1",
  "lifenode.kitchen.pantry.v1",
  "lifenode.kitchen.mealplan.v1",
  "lifenode.kanban.v1",
  "lifenode.calendar.v1",
  "lifenode_vanode_v1",
  "lifenode.tradernode.v1",
  "lifenode.tradernode.journal.v1",
  "lifenode.pronode.billable-sessions.v1",
  "lifenode.vitalnode.v3",
  "lifenode.vitalnode.v2",
  "lifenode_excalidraw_global_v1",
  "lifenode.vanode.screen-captures.v1",
  "lifenode.flare-mode.v1",
  "lifenode.flare-task-flags.v1",
  "lifenode.pro-workspace-role.v1",
  "lifenode.biznode.data-hub.v1",
  "lifenode.vanode.activeClientId",
] as const;

/**
 * Read localStorage for the exact key, then optional same-user rename keys.
 * Never copies data forward and never reads unscoped `baseKey` for a scoped key.
 */
export function readScopedLocalStorage(
  storageKey: string,
  legacyKeys: string[] = [],
): string | null {
  if (typeof window === "undefined") return null;

  const current = window.localStorage.getItem(storageKey);
  if (current) return current;

  for (const key of legacyKeys) {
    if (!key || key === storageKey) continue;
    const raw = window.localStorage.getItem(key);
    if (raw) return raw;
  }
  return null;
}

/** Remove legacy unscoped payloads from this browser (safe on sign-out). */
export function removeUnscopedStorageKeys(): void {
  if (typeof window === "undefined") return;
  for (const baseKey of USER_SCOPED_STORAGE_BASE_KEYS) {
    try {
      window.localStorage.removeItem(baseKey);
    } catch {
      /* ignore */
    }
  }
}

/**
 * One-time per device: move orphan unscoped data into the signing-in user's scoped
 * keys, then delete the unscoped copies so other accounts cannot inherit them.
 */
export function migrateUnscopedStorageToUser(userId: string): void {
  if (typeof window === "undefined") return;
  const canonical = userId.trim();
  if (!canonical) return;

  for (const baseKey of USER_SCOPED_STORAGE_BASE_KEYS) {
    const scopedKey = userScopedStorageKey(baseKey, canonical);
    try {
      const unscoped = window.localStorage.getItem(baseKey);
      if (!unscoped) continue;
      if (!window.localStorage.getItem(scopedKey)) {
        window.localStorage.setItem(scopedKey, unscoped);
      }
      window.localStorage.removeItem(baseKey);
    } catch {
      /* quota / private mode */
    }
  }
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
