"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Mic, Radio, Square } from "lucide-react";

type LiveCaptureState = {
  isCapturing: boolean;
  transcriptText: string;
  title: string;
  startCapture: (title?: string) => void;
  stopCapture: () => void;
  setTitle: (title: string) => void;
  clearAll: () => void;
};

const LiveCaptureContext = createContext<LiveCaptureState | null>(null);

export function useLiveCapture() {
  const ctx = useContext(LiveCaptureContext);
  if (!ctx) {
    throw new Error("useLiveCapture must be used within LiveCaptureProvider");
  }
  return ctx;
}

export function useLiveCaptureOptional() {
  return useContext(LiveCaptureContext);
}

function LiveCaptureFloatingCard({
  isCapturing,
  transcriptText,
  title,
  onStop,
}: {
  isCapturing: boolean;
  transcriptText: string;
  title: string;
  onStop: () => void;
}) {
  if (!isCapturing || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed bottom-5 right-5 z-[99990] w-[min(440px,calc(100vw-2rem))] rounded-2xl border border-teal-400/40 bg-slate-900/88 px-4 py-3 text-white shadow-[0_12px_48px_rgba(0,0,0,0.45)] backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <Mic className="h-4 w-4" />
          Live capture
        </div>
        <button
          type="button"
          onClick={onStop}
          className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-xs font-bold hover:bg-white/25"
        >
          <Square className="h-3 w-3 fill-current" />
          Stop
        </button>
      </div>
      <p className="mt-1 truncate text-[11px] text-white/70">{title || "Session"}</p>
      <p className="mt-0.5 text-[10px] text-teal-200/90">
        Stays on top while you switch tabs, nodes, or use Zoom / Meet (mic + tab audio when shared).
      </p>
      <div className="mt-2 max-h-40 overflow-y-auto text-sm leading-relaxed text-white/95">
        {transcriptText.trim() ? (
          <p className="whitespace-pre-wrap">{transcriptText}</p>
        ) : (
          <span className="text-white/50">Listening…</span>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function LiveCaptureProvider({ children }: { children: ReactNode }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [title, setTitle] = useState("Client sync");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const mockTimerRef = useRef<number | null>(null);

  const stopRecognition = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopRecognition();
  }, [stopRecognition]);

  const startCapture = useCallback(
    (sessionTitle?: string) => {
      if (sessionTitle?.trim()) setTitle(sessionTitle.trim());
      setTranscriptText("");
      setIsCapturing(true);
      stopRecognition();

      interface WebSpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((this: WebSpeechRecognition, ev: Event) => void) | null;
        start: () => void;
        stop: () => void;
      }

      type WinWithSpeech = Window & {
        SpeechRecognition?: new () => WebSpeechRecognition;
        webkitSpeechRecognition?: new () => WebSpeechRecognition;
      };

      const SR =
        typeof window !== "undefined"
          ? (window as WinWithSpeech).SpeechRecognition ||
            (window as WinWithSpeech).webkitSpeechRecognition
          : undefined;

      if (!SR) {
        mockTimerRef.current = window.setInterval(() => {
          setTranscriptText((prev) => {
            const note = `[${new Date().toLocaleTimeString()}] (demo) meeting note`;
            return prev ? `${prev}\n${note}` : note;
          });
        }, 2200);
        return;
      }

      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";
      r.onresult = (ev: Event) => {
        const speechEv = ev as unknown as {
          results: ArrayLike<{ 0?: { transcript?: string } }>;
        };
        let composed = "";
        for (let i = 0; i < speechEv.results.length; i++) {
          composed += speechEv.results[i]?.[0]?.transcript ?? "";
        }
        setTranscriptText(composed.trim());
      };
      r.start();
      recRef.current = r;
    },
    [stopRecognition],
  );

  const stopCapture = useCallback(() => {
    setIsCapturing(false);
    stopRecognition();
  }, [stopRecognition]);

  const clearAll = useCallback(() => {
    stopCapture();
    setTranscriptText("");
  }, [stopCapture]);

  return (
    <LiveCaptureContext.Provider
      value={{
        isCapturing,
        transcriptText,
        title,
        startCapture,
        stopCapture,
        setTitle,
        clearAll,
      }}
    >
      {children}
      <LiveCaptureFloatingCard
        isCapturing={isCapturing}
        transcriptText={transcriptText}
        title={title}
        onStop={stopCapture}
      />
    </LiveCaptureContext.Provider>
  );
}
