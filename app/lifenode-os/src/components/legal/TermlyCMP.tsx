"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Re-runs Termly initialization after client-side navigations so the CMP
 * stays in sync on SPA route changes. The resource-blocker script is loaded
 * from root layout via next/script (beforeInteractive).
 */
export default function TermlyCMP() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const termly = (window as Window & { Termly?: { initialize?: () => void } })
      .Termly;
    try {
      termly?.initialize?.();
    } catch {
      /* Termly not ready yet */
    }
  }, [pathname, searchParams]);

  return null;
}
