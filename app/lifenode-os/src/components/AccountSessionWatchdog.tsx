"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  clearUserBrowserPersistence,
  signOutWithClientCleanup,
} from "@/src/lib/sessionClientIsolation";

const POLL_MS = 30_000;

/**
 * Signs the user out on this device when their account was deleted elsewhere
 * (mobile, another tab, etc.). Complements NextAuth session refetch on focus.
 */
export default function AccountSessionWatchdog() {
  const { status, data: session } = useSession();
  const signingOut = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      signingOut.current = false;
      return;
    }

    const userId = session?.user?.id;
    const legacyUserId = session?.user?.legacyUserId;

    const enforceSignOut = async () => {
      if (signingOut.current) return;
      signingOut.current = true;
      await clearUserBrowserPersistence(userId, legacyUserId);
      await signOutWithClientCleanup(userId, {
        callbackUrl: "/auth/signin?deleted=1",
      });
    };

    const check = async () => {
      if (signingOut.current) return;
      try {
        const res = await fetch("/api/account/session-status", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.status === 401) {
          const body = (await res.json().catch(() => ({}))) as {
            code?: string;
          };
          if (body.code === "ACCOUNT_DELETED" || body.code === "UNAUTHENTICATED") {
            await enforceSignOut();
          }
        }
      } catch {
        /* offline — keep current session until next check */
      }
    };

    void check();

    const intervalId = window.setInterval(() => {
      void check();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [status, session?.user?.id, session?.user?.legacyUserId]);

  return null;
}
