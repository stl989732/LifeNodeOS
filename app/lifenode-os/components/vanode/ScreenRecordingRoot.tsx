"use client";

import { createContext, useCallback, useState } from "react";
import { ScreenRecordingProvider } from "./ScreenRecordingContext";

export const ScreenRecordingRefreshContext = createContext(0);

type Props = {
  children: React.ReactNode;
};

/** Global screen recording — survives tab/node switches while capturing. */
export default function ScreenRecordingRoot({ children }: Props) {
  const [captureRefresh, setCaptureRefresh] = useState(0);

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
