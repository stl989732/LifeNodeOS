"use client";

import { useEffect, useRef } from "react";

/**
 * Bootstraps Termly once per browser session. The resource-blocker script loads
 * from root layout (beforeInteractive). Re-calling initialize on SPA navigations
 * was re-showing the consent banner after Accept/Decline.
 */
export default function TermlyCMP() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || typeof window === "undefined") return;
    initializedRef.current = true;
    const termly = (window as Window & { Termly?: { initialize?: () => void } })
      .Termly;
    try {
      termly?.initialize?.();
    } catch {
      /* Termly not ready yet */
    }
  }, []);

  return null;
}
