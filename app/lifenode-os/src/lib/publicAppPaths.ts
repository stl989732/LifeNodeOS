/** Routes where Linos assistant/alerts should stay hidden (marketing + legal + auth). */
export const LINOS_HIDDEN_PATH_PREFIXES = [
  "/",
  "/dashboard",
  "/shell",
  "/auth",
  "/terms",
  "/privacy",
  "/cookie-policy",
  "/docs",
  "/pricing",
  "/compare",
  "/blog",
  "/catalog",
  "/support",
] as const;

export function shouldHideLinosOnPath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  return LINOS_HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
