"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { hydrateConfiguredHatKeys } from "@/lib/sync-configured-hats";
import { migrateLegacyUserScopedKeys } from "@/src/lib/userScopedStorage";

/**
 * Runs once per authenticated session: migrates localStorage from a legacy OAuth
 * user id to the canonical credential id, then hydrates shell hats from the API.
 * Helps mobile browsers keep node picks after sign-out / sign-in.
 */
export default function SessionPersistenceBootstrap() {
  const { status, data: session } = useSession();
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    const userId = session?.user?.id?.trim();
    if (!userId || ranForUser.current === userId) return;
    ranForUser.current = userId;

    const legacyId = session?.user?.legacyUserId?.trim();
    if (legacyId && legacyId !== userId) {
      migrateLegacyUserScopedKeys(userId, legacyId);
    }

    void hydrateConfiguredHatKeys();
  }, [status, session?.user?.id, session?.user?.legacyUserId]);

  return null;
}
