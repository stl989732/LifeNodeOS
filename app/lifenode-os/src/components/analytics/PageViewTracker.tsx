"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const VISITOR_STORAGE_KEY = "lifenode.visitor_id.v1";
const SESSION_PATH_PREFIX = "lifenode.pageview.session:";

function shouldSkipPath(pathname: string): boolean {
  if (!pathname) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/_next")) return true;
  return false;
}

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_STORAGE_KEY)?.trim();
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_STORAGE_KEY, id);
    return id;
  } catch {
    return `anon_${Date.now().toString(36)}`;
  }
}

/**
 * Fires a lightweight page-view beacon once per pathname per browser session
 * so Admin can show how many people viewed the web app.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || shouldSkipPath(pathname)) return;
    if (lastSent.current === pathname) return;

    try {
      const sessionKey = `${SESSION_PATH_PREFIX}${pathname}`;
      if (sessionStorage.getItem(sessionKey) === "1") {
        lastSent.current = pathname;
        return;
      }
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      /* private mode — still send once per mount path via ref */
    }

    lastSent.current = pathname;
    const visitorKey = getOrCreateVisitorId();

    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {
      /* ignore beacon failures */
    });
  }, [pathname]);

  return null;
}
