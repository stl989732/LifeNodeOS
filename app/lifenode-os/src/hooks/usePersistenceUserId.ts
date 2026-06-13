"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { bootstrapPersistenceSession } from "@/src/lib/crossDeviceSync";

/** Canonical persistence user id (matches shell state + account deletion). */
export function usePersistenceUserId(): string | null {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setUserId(null);
      return;
    }

    const sessionUserId = session?.user?.id?.trim();
    if (!sessionUserId) {
      setUserId(null);
      return;
    }

    let cancelled = false;
    void bootstrapPersistenceSession().then((resolved) => {
      if (cancelled) return;
      setUserId(resolved?.userId ?? sessionUserId);
    });

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id]);

  return userId;
}
