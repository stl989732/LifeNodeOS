"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import AccountSessionWatchdog from "@/src/components/AccountSessionWatchdog";
import SessionPersistenceBootstrap from "@/src/components/SessionPersistenceBootstrap";
import { PlanEntitlementsProvider } from "@/src/context/PlanEntitlementsContext";

export function AuthProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus>
      <AccountSessionWatchdog />
      <SessionPersistenceBootstrap>
        <PlanEntitlementsProvider>{children}</PlanEntitlementsProvider>
      </SessionPersistenceBootstrap>
    </SessionProvider>
  );
}
