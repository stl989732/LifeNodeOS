"use client";

import { useLayoutEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { hydrateConfiguredHatKeys } from "@/lib/sync-configured-hats";
import { bootstrapUserClientStorage } from "@/src/lib/sessionClientIsolation";

/**
 * Runs once per authenticated session: migrates localStorage for the signed-in
 * user, then hydrates shell hats from the API. Uses useLayoutEffect so unscoped
 * data is drained before node components read localStorage.
 */
export default function SessionPersistenceBootstrap() {
  const { status, data: session } = useSession();
  const ranForUser = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (status === "unauthenticated") {
      ranForUser.current = null;
      return;
    }
    if (status !== "authenticated") return;
    const userId = session?.user?.id?.trim();
    if (!userId || ranForUser.current === userId) return;
    ranForUser.current = userId;

    bootstrapUserClientStorage(userId, session?.user?.legacyUserId?.trim());
    void hydrateConfiguredHatKeys();
  }, [status, session?.user?.id, session?.user?.legacyUserId]);

  return null;
}
