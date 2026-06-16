import { isShellHatKey, type ShellHatKey } from "@/lib/node-mappings";
import { userScopedStorageKey } from "@/src/lib/userScopedStorage";

export const PENDING_SHELL_HATS_KEY = "lifenode_pending_shell_hats";

const CONFIGURED_HATS_BACKUP_BASE = "lifenode.configured-hats.backup.v1";

export function saveConfiguredHatsBackup(
  userId: string,
  hats: ShellHatKey[],
): void {
  if (typeof window === "undefined" || !userId.trim() || !hats.length) return;
  try {
    window.localStorage.setItem(
      userScopedStorageKey(CONFIGURED_HATS_BACKUP_BASE, userId.trim()),
      JSON.stringify(hats),
    );
  } catch {
    /* quota / private mode */
  }
}

export function readConfiguredHatsBackup(userId: string): ShellHatKey[] {
  if (typeof window === "undefined" || !userId.trim()) return [];
  try {
    const raw = window.localStorage.getItem(
      userScopedStorageKey(CONFIGURED_HATS_BACKUP_BASE, userId.trim()),
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isShellHatKey);
  } catch {
    return [];
  }
}

/** Persist landing-quiz hat picks until they are saved to user state. */
export function savePendingShellHats(hats: string[]): void {
  if (typeof window === "undefined") return;
  const valid = hats.filter(isShellHatKey);
  if (!valid.length) return;
  const payload = JSON.stringify(valid);
  try {
    window.localStorage.setItem(PENDING_SHELL_HATS_KEY, payload);
    window.sessionStorage.setItem(PENDING_SHELL_HATS_KEY, payload);
  } catch {
    /* quota / private mode */
  }
}

export function readPendingShellHats(): ShellHatKey[] {
  if (typeof window === "undefined") return [];
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = store.getItem(PENDING_SHELL_HATS_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      const valid = parsed.filter(isShellHatKey);
      if (valid.length) return valid;
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function clearPendingShellHats(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_SHELL_HATS_KEY);
    window.sessionStorage.removeItem(PENDING_SHELL_HATS_KEY);
  } catch {
    /* ignore */
  }
}

export function notifyConfiguredHatsUpdated(hats: ShellHatKey[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("lifenode:hats:updated", { detail: { hats } }),
  );
}

/** Merge server hats with local pending picks (server wins, pending fills gaps). */
export function mergeConfiguredHatKeys(
  serverHats: string[] | undefined | null,
  pendingHats: ShellHatKey[],
): ShellHatKey[] {
  const fromServer = Array.isArray(serverHats)
    ? serverHats.filter(isShellHatKey)
    : [];
  const merged = [...fromServer];
  for (const hat of pendingHats) {
    if (!merged.includes(hat)) merged.push(hat);
  }
  return merged;
}

export async function persistConfiguredHatsToApi(
  hats: ShellHatKey[],
): Promise<boolean> {
  if (!hats.length) return false;
  try {
    const res = await fetch("/api/user-state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ configuredHats: hats }),
    });
    if (!res.ok) return false;
    clearPendingShellHats();
    notifyConfiguredHatsUpdated(hats);
    return true;
  } catch {
    return false;
  }
}

/** Load hats from API, fall back to pending local picks, and flush pending when possible. */
export async function hydrateConfiguredHatKeys(
  userId?: string,
): Promise<ShellHatKey[]> {
  let serverHats: ShellHatKey[] = [];
  try {
    const res = await fetch("/api/user-state", {
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        state?: { configuredHats?: string[] };
      };
      serverHats = mergeConfiguredHatKeys(data.state?.configuredHats, []);
    }
  } catch {
    /* offline */
  }

  const pending = readPendingShellHats();
  const backup =
    userId?.trim() ? readConfiguredHatsBackup(userId.trim()) : [];
  const merged = mergeConfiguredHatKeys(
    mergeConfiguredHatKeys(serverHats, pending),
    backup,
  );

  if (merged.length && userId?.trim()) {
    saveConfiguredHatsBackup(userId.trim(), merged);
  }

  if (merged.length && (pending.length || serverHats.length === 0)) {
    void persistConfiguredHatsToApi(merged);
  } else if (merged.length) {
    notifyConfiguredHatsUpdated(merged);
  }

  return merged;
}
