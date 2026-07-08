"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Termly?: {
      initialize: () => void;
    };
  }
}

const TERMLY_CONSENT_CACHE_KEY = "TERMLY_API_CACHE";
const TERMLY_READY_POLL_MS = 50;
const TERMLY_READY_TIMEOUT_MS = 15_000;

/** Survives React Strict Mode remounts within one full page load. */
let termlyBootstrapComplete = false;

function hasTermlyConsentOnRecord(): boolean {
  try {
    const raw = window.localStorage.getItem(TERMLY_CONSENT_CACHE_KEY);
    return Boolean(raw && raw.length > 2);
  } catch {
    return false;
  }
}

function bootstrapTermly(): boolean {
  if (termlyBootstrapComplete || typeof window === "undefined") {
    return termlyBootstrapComplete;
  }
  if (!window.Termly?.initialize) return false;

  termlyBootstrapComplete = true;

  // Re-calling initialize when consent is already stored re-opens the banner.
  if (hasTermlyConsentOnRecord()) return true;

  try {
    window.Termly.initialize();
  } catch (error) {
    console.warn("[Termly] initialize failed:", error);
  }
  return true;
}

/**
 * Bootstraps Termly once per full page load. The resource-blocker script loads
 * from root layout (`beforeInteractive`). Do not re-initialize on SPA navigations
 * or when TERMLY_API_CACHE already holds the visitor's choice.
 */
export default function TermlyCMP() {
  useEffect(() => {
    if (bootstrapTermly()) return;

    let cancelled = false;
    const started = Date.now();

    const poll = window.setInterval(() => {
      if (cancelled) return;
      if (bootstrapTermly()) {
        window.clearInterval(poll);
        return;
      }
      if (Date.now() - started >= TERMLY_READY_TIMEOUT_MS) {
        window.clearInterval(poll);
      }
    }, TERMLY_READY_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

  return null;
}
