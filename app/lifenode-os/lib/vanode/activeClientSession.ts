/** Mirrors VANode active workspace client for global providers (screen capture, etc.). */
const KEY = "lifenode.vanode.activeClientId";

export function syncActiveClientSession(clientId: string | null) {
  if (typeof window === "undefined") return;
  if (clientId) sessionStorage.setItem(KEY, clientId);
  else sessionStorage.removeItem(KEY);
}

export function readActiveClientSession(): string | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(KEY);
  return v && v.trim() ? v.trim() : null;
}
