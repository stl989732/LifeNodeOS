"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import LoadingOverlay from "@/src/components/LoadingOverlay";

type LoadingOverlayContextValue = {
  show: (message?: string) => void;
  hide: () => void;
};

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(
  null,
);

export function LoadingOverlayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const show = useCallback((msg?: string) => {
    setMessage(typeof msg === "string" ? msg : "");
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    setMessage("");
  }, []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <LoadingOverlayContext.Provider value={value}>
      {children}
      <LoadingOverlay open={open} message={message} />
    </LoadingOverlayContext.Provider>
  );
}

export function useLoadingOverlay() {
  const ctx = useContext(LoadingOverlayContext);
  if (!ctx) {
    throw new Error("useLoadingOverlay must be used within LoadingOverlayProvider");
  }
  return ctx;
}
