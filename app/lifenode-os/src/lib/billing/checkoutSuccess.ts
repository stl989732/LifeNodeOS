export const CHECKOUT_SUCCESS_SESSION_KEY = "lifenode.checkout.success";

export function isCheckoutSuccessQuery(search: string): boolean {
  if (!search) return false;
  const normalized = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(normalized).get("checkout") === "success";
}

export function shellPathWithSearch(search: string): string {
  if (!search || search === "?") return "/shell";
  return search.startsWith("?") ? `/shell${search}` : `/shell?${search}`;
}

export function markCheckoutSuccessSession(): void {
  try {
    sessionStorage.setItem(CHECKOUT_SUCCESS_SESSION_KEY, "1");
  } catch {
    /* private mode / disabled storage */
  }
}

export function readCheckoutSuccessSession(): boolean {
  try {
    return sessionStorage.getItem(CHECKOUT_SUCCESS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearCheckoutSuccessSession(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_SUCCESS_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
