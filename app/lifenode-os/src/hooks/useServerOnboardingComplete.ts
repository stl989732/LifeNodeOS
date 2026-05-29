"use client";

import { useEffect } from "react";
import type { ActiveNodeName } from "@/lib/node-mappings";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";

/**
 * When `/onboarding/[hat]` (Lino) is already complete for this node, run `onComplete`
 * so node-local setup wizards do not repeat the same flow.
 */
export function useServerOnboardingComplete(
  node: ActiveNodeName,
  onComplete: () => void,
) {
  useEffect(() => {
    if (DEV_FRESH_SESSION) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/user-state/onboarding", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const status = data?.statuses?.[node];
        if (!cancelled && status?.onboardingCompleted) {
          onComplete();
        }
      } catch {
        // Non-fatal — local setup may still run.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [node, onComplete]);
}
