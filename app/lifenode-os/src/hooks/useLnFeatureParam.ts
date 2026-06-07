"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Reads `?ln-feature=` from the URL once per navigation and invokes the handler.
 * Clears the param after apply so refreshes do not re-trigger.
 * Uses `window.location` (not `useSearchParams`) to avoid Suspense boundaries on static pages.
 */
export function useLnFeatureParam(onFeature: (featureId: string) => void) {
  const pathname = usePathname();
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const feature = params.get("ln-feature")?.trim();
    if (!feature) {
      handled.current = null;
      return;
    }
    const key = `${pathname}:${feature}`;
    if (handled.current === key) return;
    handled.current = key;
    onFeature(feature);
    params.delete("ln-feature");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, onFeature]);
}

const FEATURE_ID_ALIASES: Record<string, string> = {
  architect: "vital-architect",
  timeline: "pro-auto-timeline",
};

export function scrollToLnFeature(featureId: string) {
  if (typeof document === "undefined") return;
  const candidates = [
    `ln-feature-${featureId}`,
    featureId,
    FEATURE_ID_ALIASES[featureId],
  ].filter(Boolean) as string[];
  for (const id of candidates) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
}
