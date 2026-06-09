"use client";

import dynamic from "next/dynamic";
import { Camera, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { loadVanode } from "@/lib/vanode/storage";
import { toTitleCase } from "@/lib/vanode/title-case";
import { whiteboardVaultNotePayload } from "@/lib/vanode/whiteboard-vault-pending";
import { useWhiteboardVaultBridge } from "@/src/context/WhiteboardVaultBridgeContext";
import {
  captureWhiteboardPngDataUrl,
  persistWhiteboardScene,
} from "./whiteboardExcalidrawActions";

const ExcalidrawStage = dynamic(() => import("./WhiteboardExcalidrawStage"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
      Loading whiteboard…
    </div>
  ),
});

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function GlobalWhiteboardOverlay({ open, onClose }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : null;
  const bridge = useWhiteboardVaultBridge();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shutter, setShutter] = useState(false);

  const handleCloseSave = useCallback(() => {
    const api = apiRef.current;
    if (api) void persistWhiteboardScene(api, userId);
    onClose();
  }, [onClose, userId]);

  const handleCapture = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    setShutter(true);
    window.setTimeout(() => setShutter(false), 420);
    try {
      const dataUrl = await captureWhiteboardPngDataUrl(api);
      const va = loadVanode();
      const title = `Whiteboard Export - ${new Date().toLocaleString()}`;
      const note = whiteboardVaultNotePayload({
        dataUrl,
        title,
        clientId: va.activeClientId,
      });
      bridge.captureToVault(note);
      setToast("Sketch captured! Draft created in Smart Vault.");
      window.setTimeout(() => setToast(null), 4500);
    } catch {
      setToast("Could not export the sketch. Try again.");
      window.setTimeout(() => setToast(null), 4000);
    }
  }, [bridge]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col border border-white/10 bg-slate-950/40 shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur-[25px]"
      role="dialog"
      aria-modal
      aria-label="Global whiteboard"
    >
      {shutter ? (
        <div
          className="pointer-events-none fixed inset-0 z-[10000] animate-pulse bg-white/70"
          aria-hidden
        />
      ) : null}

      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 bg-white/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200/90">
            {toTitleCase("global whiteboard")}
          </p>
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-white">
            Sketch · SOP · Cross-hat
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCapture}
            className="inline-flex items-center gap-2 rounded-xl border border-[#00ffc8]/40 bg-[#00ffc8]/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#00ffc8] shadow-[0_0_18px_rgba(0,255,200,0.12)] transition hover:bg-[#00ffc8]/25"
          >
            <Camera className="h-4 w-4" />
            {toTitleCase("Screenshot To Vault")}
          </button>
          <button
            type="button"
            onClick={handleCloseSave}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/20"
          >
            {toTitleCase("Close & Save")}
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#f4f4f5] p-2 md:p-4">
        <ExcalidrawStage excalidRef={apiRef} />
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[10001] -translate-x-1/2 rounded-full border border-white/20 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
