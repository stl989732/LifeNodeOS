"use client";

import { useSession } from "next-auth/react";
import { userScopedStorageKey } from "@/src/lib/userScopedStorage";

/** Resolves a localStorage key scoped to the current NextAuth user id. */
export function useUserScopedStorageKey(baseKey: string): string {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  return userScopedStorageKey(baseKey, userId);
}
