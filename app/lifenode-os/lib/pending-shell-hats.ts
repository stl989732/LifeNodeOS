import { isShellHatKey, type ShellHatKey } from "@/lib/node-mappings";

export const PENDING_SHELL_HATS_KEY = "lifenode_pending_shell_hats";

/** Persist landing-quiz hat picks until the user signs in on /shell. */
export function savePendingShellHats(hats: string[]): void {
  if (typeof window === "undefined") return;
  const valid = hats.filter(isShellHatKey);
  if (!valid.length) return;
  try {
    sessionStorage.setItem(PENDING_SHELL_HATS_KEY, JSON.stringify(valid));
  } catch {
    /* quota / private mode */
  }
}

export function readPendingShellHats(): ShellHatKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PENDING_SHELL_HATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isShellHatKey);
  } catch {
    return [];
  }
}

export function clearPendingShellHats(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_SHELL_HATS_KEY);
  } catch {
    /* ignore */
  }
}
