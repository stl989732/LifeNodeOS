"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import SessionPersistenceBootstrap from "@/src/components/SessionPersistenceBootstrap";

export function AuthProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionPersistenceBootstrap />
      {children}
    </SessionProvider>
  );
}
