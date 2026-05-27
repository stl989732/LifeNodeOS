"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Note } from "@/lib/vanode/types";
import { pushPendingWhiteboardVault } from "@/lib/vanode/whiteboard-vault-pending";

type VaultCaptureFn = (note: Omit<Note, "id" | "updatedAt">) => void;

const WhiteboardVaultBridgeContext = createContext<{
  registerVaultCapture: (fn: VaultCaptureFn | null) => void;
  captureToVault: (note: Omit<Note, "id" | "updatedAt">) => void;
} | null>(null);

export function WhiteboardVaultBridgeProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<VaultCaptureFn | null>(null);

  const registerVaultCapture = useCallback((fn: VaultCaptureFn | null) => {
    handlerRef.current = fn;
  }, []);

  const captureToVault = useCallback((note: Omit<Note, "id" | "updatedAt">) => {
    if (handlerRef.current) {
      handlerRef.current(note);
      return;
    }
    pushPendingWhiteboardVault({
      title: note.title,
      body: note.body,
      clientId: note.clientId,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const value = useMemo(
    () => ({ registerVaultCapture, captureToVault }),
    [registerVaultCapture, captureToVault],
  );

  return (
    <WhiteboardVaultBridgeContext.Provider value={value}>
      {children}
    </WhiteboardVaultBridgeContext.Provider>
  );
}

export function useWhiteboardVaultBridge() {
  const ctx = useContext(WhiteboardVaultBridgeContext);
  if (!ctx) {
    throw new Error("useWhiteboardVaultBridge requires WhiteboardVaultBridgeProvider");
  }
  return ctx;
}

export function useWhiteboardVaultBridgeOptional() {
  return useContext(WhiteboardVaultBridgeContext);
}
