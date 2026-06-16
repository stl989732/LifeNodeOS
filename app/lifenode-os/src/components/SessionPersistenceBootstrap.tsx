"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { hydrateConfiguredHatKeys } from "@/lib/sync-configured-hats";
import {
  bootstrapPersistenceSession,
  syncCrossDeviceWidgets,
} from "@/src/lib/crossDeviceSync";
import { bootstrapUserClientStorage } from "@/src/lib/sessionClientIsolation";

type Props = {
  children: ReactNode;
};

/**
 * Per sign-in: migrate localStorage, merge legacy OAuth ids, sync widgets with
 * Supabase, then hydrate shell hats. Blocks authenticated UI until the first
 * cloud round-trip completes so mobile sees the same data as desktop.
 */
export default function SessionPersistenceBootstrap({ children }: Props) {
  const { status, data: session } = useSession();
  const ranForUser = useRef<string | null>(null);
  const [syncReady, setSyncReady] = useState(false);

  useLayoutEffect(() => {
    if (status === "unauthenticated") {
      ranForUser.current = null;
      setSyncReady(true);
      return;
    }
    if (status !== "authenticated") {
      setSyncReady(false);
      return;
    }

    const sessionUserId = session?.user?.id?.trim();
    if (!sessionUserId) return;

    if (ranForUser.current === sessionUserId) {
      setSyncReady(true);
      return;
    }

    let cancelled = false;
    setSyncReady(false);

    void (async () => {
      bootstrapUserClientStorage(
        sessionUserId,
        session?.user?.legacyUserId?.trim(),
      );

      const resolved = await bootstrapPersistenceSession();
      const canonicalUserId = resolved?.userId ?? sessionUserId;

      await syncCrossDeviceWidgets(canonicalUserId);
      if (cancelled) return;

      ranForUser.current = canonicalUserId;
      await hydrateConfiguredHatKeys(canonicalUserId);
      if (!cancelled) setSyncReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, session?.user?.legacyUserId]);

  if (status === "authenticated" && !syncReady) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        Syncing your account…
      </div>
    );
  }

  return <>{children}</>;
}
