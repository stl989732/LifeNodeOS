"use client";

import { usePathname } from "next/navigation";
import AppContextChrome from "@/src/components/AppContextChrome";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";

/** SPA-friendly Back: listeners may call `preventDefault()` to handle in-app state first. */
export const LIFENODE_CHROME_BACK = "lifenode:chrome-back";

const NODE_ROUTE_PREFIXES = [
  "/calendar",
  "/inbox",
  "/work",
  "/home",
  "/pulse",
  "/vital",
  "/pro",
  "/trader",
  "/vanode",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Global top chrome: Back, LifeNode Dashboard, session timer (nodes), and Support menu.
 * Mounted from `app/layout.tsx`; visibility is pathname-driven.
 */
export default function NodeNavChrome() {
  const pathname = usePathname();
  const { theme } = useLifeNodeContext();

  if (!pathname) return null;

  const onNodeRoute = matchesPrefix(pathname, NODE_ROUTE_PREFIXES);
  const onShell =
    pathname === "/shell" || pathname.startsWith("/shell/");
  const onNodeOnboarding = pathname.startsWith("/onboarding/");
  const onSupport = pathname.startsWith("/support/");

  if (!onNodeRoute && !onShell && !onNodeOnboarding && !onSupport) {
    return null;
  }

  const lightChrome =
    onNodeRoute &&
    (theme === "mint-cream" ||
      theme === "grainy-dawn" ||
      pathname.startsWith("/calendar") ||
      pathname.startsWith("/inbox") ||
      pathname.startsWith("/pulse"));

  return (
    <AppContextChrome
      variant={lightChrome ? "light" : "dark"}
      showTimer={onNodeRoute}
      offsetForRail={onNodeRoute}
    />
  );
}
