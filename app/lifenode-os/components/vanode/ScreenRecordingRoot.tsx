"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { ScreenRecordingProvider } from "./ScreenRecordingContext";
import { setScreenCaptureUserScope } from "@/lib/vanode/screenCaptureStorage";
import { hydrateScreenCaptureManifestFromServer } from "@/lib/vanode/screenCaptureSync";
import { usePersistenceUserId } from "@/src/hooks/usePersistenceUserId";

export const ScreenRecordingRefreshContext = createContext(0);

type Props = {
  children: React.ReactNode;
};

/** Global screen recording — survives LifeNode route changes while capturing. */
export default function ScreenRecordingRoot({ children }: Props) {
  const [captureRefresh, setCaptureRefresh] = useState(0);
  const userId = usePersistenceUserId();

  useEffect(() => {
    setScreenCaptureUserScope(userId ?? undefined);
    if (userId) {
      void hydrateScreenCaptureManifestFromServer(userId);
    }
  }, [userId]);

  const onSaved = useCallback(() => {
    setCaptureRefresh((k) => k + 1);
  }, []);

  return (
    <ScreenRecordingProvider onSaved={onSaved}>
      <ScreenRecordingRefreshContext.Provider value={captureRefresh}>
        {children}
      </ScreenRecordingRefreshContext.Provider>
    </ScreenRecordingProvider>
  );
}
