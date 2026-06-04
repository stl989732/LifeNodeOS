"use client";

import { LiveCaptureProvider } from "./LiveCaptureContext";

/** Mounts global live capture (floating transcript) for all LifeNode routes. */
export default function LiveCaptureRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LiveCaptureProvider>{children}</LiveCaptureProvider>;
}
