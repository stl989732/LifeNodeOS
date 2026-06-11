import { signOut, type SignOutParams } from "next-auth/react";
import { clearPendingShellHats } from "@/lib/sync-configured-hats";
import {
  migrateLegacyUserScopedKeys,
  migrateUnscopedStorageToUser,
  removeUnscopedStorageKeys,
  USER_SCOPED_STORAGE_BASE_KEYS,
  userScopedStorageKey,
} from "@/src/lib/userScopedStorage";

const LEGACY_LINOS_CHAT_ID_KEY = "linos-chat-id-v1";
const LINOS_CHAT_ID_KEY_PREFIX = LEGACY_LINOS_CHAT_ID_KEY;
const ASSISTANT_PREFS_KEY = "linos-assistant-prefs-v1";
const SETTINGS_STORAGE_KEY = "lifenode_os_settings_v1";
const BIZNODE_ONBOARDING_KEY = "lifenode.biznode.master-sync.v3";
const BIZNODE_ONBOARDING_LEGACY = "lifenode.biznode.master-sync.v2";

/** Clears local keys that are not namespaced per user and can leak across accounts. */
export function clearSessionGlobalClientState(): void {
  if (typeof window === "undefined") return;
  try {
    clearPendingShellHats();
    window.localStorage.removeItem(LEGACY_LINOS_CHAT_ID_KEY);
    window.localStorage.removeItem(ASSISTANT_PREFS_KEY);
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    window.localStorage.removeItem(BIZNODE_ONBOARDING_KEY);
    window.localStorage.removeItem(BIZNODE_ONBOARDING_LEGACY);
  } catch {
    /* quota / private mode */
  }
  window.dispatchEvent(new CustomEvent("lifenode:session:cleared"));
}

/**
 * Before sign-out: drop orphan unscoped node payloads so the next account cannot
 * inherit them. Per-user `baseKey::userId` entries are kept for the same user on re-login.
 */
export function prepareClientForSignOut(userId: string | undefined): void {
  if (typeof window === "undefined") return;
  removeUnscopedStorageKeys();
  clearSessionGlobalClientState();
  if (userId?.trim()) {
    try {
      window.sessionStorage.removeItem(`lifenode.session.last-user:${userId.trim()}`);
    } catch {
      /* ignore */
    }
  }
}

export async function signOutWithClientCleanup(
  userId: string | undefined,
  options?: SignOutParams<true>,
): Promise<void> {
  prepareClientForSignOut(userId);
  await signOut(options);
}

/** Runs once per authenticated user id in the current tab. */
export function bootstrapUserClientStorage(userId: string, legacyUserId?: string): void {
  if (typeof window === "undefined" || !userId.trim()) return;
  const canonical = userId.trim();
  if (legacyUserId?.trim() && legacyUserId.trim() !== canonical) {
    migrateLegacyUserScopedKeys(canonical, legacyUserId.trim());
  }
  migrateUnscopedStorageToUser(canonical);
  try {
    window.sessionStorage.setItem(`lifenode.session.last-user:${canonical}`, canonical);
  } catch {
    /* ignore */
  }
}

export function assistantPrefsStorageKey(userId: string): string {
  return userScopedStorageKey(ASSISTANT_PREFS_KEY, userId);
}

function deleteIndexedDbDatabase(name: string): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/** Remove all browser caches for one or more user ids (post server deletion). */
export async function clearUserBrowserPersistence(
  ...userIds: Array<string | null | undefined>
): Promise<void> {
  if (typeof window === "undefined") return;

  const ids = new Set<string>();
  for (const raw of userIds) {
    const id = raw?.trim();
    if (id) ids.add(id);
  }

  removeUnscopedStorageKeys();
  clearSessionGlobalClientState();

  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    for (const id of ids) {
      if (key.endsWith(`::${id}`) || key.includes(`::${id}::`)) {
        keysToRemove.push(key);
      }
    }
    if (key.startsWith(`${LINOS_CHAT_ID_KEY_PREFIX}:`)) {
      for (const id of ids) {
        if (key === `${LINOS_CHAT_ID_KEY_PREFIX}:${id}`) keysToRemove.push(key);
      }
    }
  }

  for (const baseKey of USER_SCOPED_STORAGE_BASE_KEYS) {
    for (const id of ids) {
      keysToRemove.push(userScopedStorageKey(baseKey, id));
      keysToRemove.push(`${userScopedStorageKey(baseKey, id)}::widget_updated_at`);
    }
  }
  for (const id of ids) {
    keysToRemove.push(assistantPrefsStorageKey(id));
  }

  for (const key of new Set(keysToRemove)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  for (const id of ids) {
    await deleteIndexedDbDatabase(`lifenode-vanode-screen-captures::${id}`);
    try {
      window.sessionStorage.removeItem(`lifenode.session.last-user:${id}`);
    } catch {
      /* ignore */
    }
  }
  await deleteIndexedDbDatabase("lifenode-vanode-screen-captures");
}
