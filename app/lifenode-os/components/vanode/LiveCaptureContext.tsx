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
import { Mic, Minus, Pause, Play, Square } from "lucide-react";
import { useDraggableFloatingPosition } from "@/src/components/vanode/useDraggableFloatingPosition";

type LiveCaptureState = {
  isCapturing: boolean;
  transcriptText: string;
  title: string;
  startCapture: (title?: string) => void;
  stopCapture: () => string;
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
  paused,
  transcriptText,
  title,
  minimized,
  onToggleMinimize,
  onTogglePause,
  onStop,
}: {
  isCapturing: boolean;
  paused: boolean;
  transcriptText: string;
  title: string;
  minimized: boolean;
  onToggleMinimize: () => void;
  onTogglePause: () => void;
  onStop: () => void;
}) {
  const { style, dragHandleProps } = useDraggableFloatingPosition(
    "lifenode.vanode.live-capture-card",
    { width: 440, height: minimized ? 56 : 200 },
  );

  if (!isCapturing || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed z-[2147483000] w-[min(440px,calc(100vw-2rem))] rounded-2xl border border-teal-400/40 bg-slate-900/92 px-4 py-3 text-white shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-md"
      style={{ left: style.left, top: style.top }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold"
        >
          <button
            type="button"
            className="cursor-grab rounded-lg p-1 text-white/40 hover:bg-white/10 active:cursor-grabbing"
            aria-label="Drag to move"
            {...dragHandleProps}
          >
            <span className="block h-4 w-1 rounded-full bg-white/50" />
          </button>
          {!paused ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
          ) : (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
          )}
          <Mic className="h-4 w-4 shrink-0" />
          <span className="truncate">Live capture</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onTogglePause}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20"
            aria-label={paused ? "Resume transcription" : "Pause transcription"}
          >
            {paused ? (
              <Play className="h-3 w-3 fill-current" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onStop}
            className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-xs font-bold hover:bg-white/25"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onToggleMinimize}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10"
            aria-label={minimized ? "Expand" : "Minimize"}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!minimized ? (
        <>
          <p className="mt-1 truncate text-[11px] text-white/70">{title || "Session"}</p>
          <p className="mt-0.5 text-[10px] text-teal-200/90">
            Floats above LifeNode while you use Meet, Zoom, or other tabs — share tab
            audio when prompted for best results.
          </p>
          <div className="mt-2 max-h-40 overflow-y-auto text-sm leading-relaxed text-white/95">
            {transcriptText.trim() ? (
              <p className="whitespace-pre-wrap">{transcriptText}</p>
            ) : (
              <span className="text-white/50">
                {paused ? "Paused — resume when ready." : "Listening…"}
              </span>
            )}
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  );
}

export function LiveCaptureProvider({ children }: { children: ReactNode }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [title, setTitle] = useState("Client sync");
  const transcriptRef = useRef("");
  const finalTranscriptRef = useRef("");
  const isCapturingRef = useRef(false);
  const pausedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const mockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const syncTranscript = useCallback((value: string) => {
    transcriptRef.current = value;
    setTranscriptText(value);
  }, []);

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

  const startRecognition = useCallback(() => {
    interface WebSpeechRecognition extends EventTarget {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((this: WebSpeechRecognition, ev: Event) => void) | null;
      onend: ((this: WebSpeechRecognition, ev: Event) => void) | null;
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
        const note = `[${new Date().toLocaleTimeString()}] meeting note captured`;
        syncTranscript(
          transcriptRef.current
            ? `${transcriptRef.current}\n${note}`
            : note,
        );
      }, 2200);
      return;
    }

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (ev: Event) => {
      const speechEv = ev as unknown as {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>;
      };
      let interim = "";
      for (let i = speechEv.resultIndex; i < speechEv.results.length; i++) {
        const piece = speechEv.results[i]?.[0]?.transcript ?? "";
        if (speechEv.results[i]?.isFinal) {
          finalTranscriptRef.current += piece;
        } else {
          interim += piece;
        }
      }
      syncTranscript((finalTranscriptRef.current + interim).trim());
    };
    r.onend = () => {
      if (recRef.current === r && isCapturingRef.current && !pausedRef.current) {
        try {
          r.start();
        } catch {
          /* ignore restart errors */
        }
      }
    };
    r.start();
    recRef.current = r;
  }, [syncTranscript]);

  const startCapture = useCallback(
    (sessionTitle?: string) => {
      if (sessionTitle?.trim()) setTitle(sessionTitle.trim());
      finalTranscriptRef.current = "";
      syncTranscript("");
      setPaused(false);
      setMinimized(false);
      setIsCapturing(true);
      stopRecognition();
      startRecognition();
    },
    [startRecognition, stopRecognition, syncTranscript],
  );

  const stopCapture = useCallback((): string => {
    const snapshot = transcriptRef.current.trim();
    setIsCapturing(false);
    setPaused(false);
    stopRecognition();
    if (snapshot) syncTranscript(snapshot);
    return snapshot;
  }, [stopRecognition, syncTranscript]);

  const clearAll = useCallback(() => {
    finalTranscriptRef.current = "";
    syncTranscript("");
    setIsCapturing(false);
    setPaused(false);
    stopRecognition();
  }, [stopRecognition, syncTranscript]);

  const togglePause = useCallback(() => {
    if (!isCapturing) return;
    setPaused((prev) => {
      const next = !prev;
      if (next) {
        stopRecognition();
      } else {
        startRecognition();
      }
      return next;
    });
  }, [isCapturing, startRecognition, stopRecognition]);

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
        paused={paused}
        transcriptText={transcriptText}
        title={title}
        minimized={minimized}
        onToggleMinimize={() => setMinimized((m) => !m)}
        onTogglePause={() => togglePause()}
        onStop={stopCapture}
      />
    </LiveCaptureContext.Provider>
  );
}
