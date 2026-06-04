"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { ClientProfile } from "@/lib/vanode/types";

export type ActiveClientContextValue = {
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  clients: ClientProfile[];
};

const ActiveClientContext = createContext<ActiveClientContextValue | null>(
  null,
);

export function ActiveClientProvider({
  activeClientId,
  setActiveClientId,
  clients,
  children,
}: ActiveClientContextValue & { children: ReactNode }) {
  return (
    <ActiveClientContext.Provider
      value={{ activeClientId, setActiveClientId, clients }}
    >
      {children}
    </ActiveClientContext.Provider>
  );
}

export function useActiveClient(): ActiveClientContextValue {
  const v = useContext(ActiveClientContext);
  if (!v) {
    throw new Error("useActiveClient must be used within ActiveClientProvider");
  }
  return v;
}

export function useActiveClientOptional(): ActiveClientContextValue | null {
  return useContext(ActiveClientContext);
}
