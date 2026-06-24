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
import { Pause, Play, Square } from "lucide-react";
import { readActiveClientSession } from "@/lib/vanode/activeClientSession";
import { PostRecordReviewCard } from "@/components/vanode/PostRecordReviewCard";
import { useDraggableFloatingPosition } from "@/src/components/vanode/useDraggableFloatingPosition";
import {
  pickScreenRecorderMime,
  saveScreenCapture,
  type ScreenCaptureRecord,
} from "@/lib/vanode/screenCaptureStorage";

type ScreenRecordingState = {
  active: boolean;
  paused: boolean;
  seconds: number;
  saving: boolean;
  includeMic: boolean;
  setIncludeMic: (v: boolean) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  togglePause: () => void;
  lastSavedId: string | null;
};

const ScreenRecordingContext = createContext<ScreenRecordingState | null>(null);

const REVIEW_CAPTURE_SESSION_KEY = "lifenode.vanode.review-capture-id";

function readReviewCaptureId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(REVIEW_CAPTURE_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeReviewCaptureId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) sessionStorage.setItem(REVIEW_CAPTURE_SESSION_KEY, id);
    else sessionStorage.removeItem(REVIEW_CAPTURE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function useScreenRecording() {
  const ctx = useContext(ScreenRecordingContext);
  if (!ctx) {
    throw new Error("useScreenRecording must be used within ScreenRecordingProvider");
  }
  return ctx;
}

export function useScreenRecordingOptional() {
  return useContext(ScreenRecordingContext);
}

function ScreenRecordingFloatingPill({
  active,
  paused,
  seconds,
  includeMic,
  onTogglePause,
  onStop,
}: {
  active: boolean;
  paused: boolean;
  seconds: number;
  includeMic: boolean;
  onTogglePause: () => void;
  onStop: () => void;
}) {
  const { style, dragHandleProps } = useDraggableFloatingPosition(
    "lifenode.vanode.screen-record-pill",
    { width: 340, height: 56 },
  );

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed z-[5100] flex items-center gap-3 rounded-2xl border border-white/30 bg-slate-900/78 px-4 py-3 text-white shadow-2xl backdrop-blur-xl"
      style={{ left: style.left, top: style.top }}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="cursor-grab rounded-lg p-1 text-white/40 hover:bg-white/10 active:cursor-grabbing"
        aria-label="Drag to move"
        {...dragHandleProps}
      >
        <span className="block h-4 w-1 rounded-full bg-white/50" />
      </button>
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
      </span>
      <div className="text-sm font-medium">
        Screen recording{" "}
        <span className="tabular-nums text-white/80">
          {Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0")}
          :{(seconds % 60).toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs text-white/50">
        {includeMic ? "Screen + mic" : "Screen"} · stays on all tabs
        {paused ? " · paused" : ""}
      </span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onTogglePause}
        className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold hover:bg-white/20"
        aria-label={paused ? "Resume recording" : "Pause recording"}
      >
        {paused ? (
          <Play className="h-3 w-3 fill-current" />
        ) : (
          <Pause className="h-3 w-3" />
        )}
        {paused ? "Resume" : "Pause"}
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onStop}
        className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold hover:bg-white/25"
      >
        <Square className="h-3 w-3 fill-current" />
        Stop
      </button>
    </div>,
    document.body,
  );
}

async function buildRecordingStream(
  includeMic: boolean,
  onMicWarning?: (message: string) => void,
): Promise<{ stream: MediaStream; cleanup: () => void }> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const videoTracks = displayStream.getVideoTracks();
  const displayAudioTracks = displayStream.getAudioTracks();
  const combinedTracks: MediaStreamTrack[] = [...videoTracks];

  let micStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;

  const cleanup = () => {
    displayStream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    void audioContext?.close();
  };

  if (includeMic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();

      if (displayAudioTracks.length > 0) {
        const displayAudioOnly = new MediaStream(displayAudioTracks);
        audioContext.createMediaStreamSource(displayAudioOnly).connect(dest);
      }

      micStream.getAudioTracks().forEach((track) => {
        audioContext!.createMediaStreamSource(new MediaStream([track])).connect(
          dest,
        );
      });

      dest.stream.getAudioTracks().forEach((t) => combinedTracks.push(t));
    } catch {
      displayAudioTracks.forEach((t) => combinedTracks.push(t));
      onMicWarning?.(
        "Microphone blocked — recording screen with system/tab audio only.",
      );
    }
  } else {
    displayAudioTracks.forEach((t) => combinedTracks.push(t));
  }

  return { stream: new MediaStream(combinedTracks), cleanup };
}

export function ScreenRecordingProvider({
  children,
  onSaved,
  onError,
}: {
  children: ReactNode;
  onSaved?: (record: ScreenCaptureRecord) => void;
  onError?: (message: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [includeMic, setIncludeMic] = useState(true);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [reviewCaptureId, setReviewCaptureIdState] = useState<string | null>(
    () => readReviewCaptureId(),
  );

  const setReviewCaptureId = useCallback((id: string | null) => {
    setReviewCaptureIdState(id);
    writeReviewCaptureId(id);
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);
  const includeMicRef = useRef(includeMic);
  const mimeRef = useRef({ mimeType: "video/webm", ext: "webm" });

  useEffect(() => {
    includeMicRef.current = includeMic;
  }, [includeMic]);

  const stopTracks = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setPaused(false);
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.requestData();
      } catch {
        /* ignore */
      }
      rec.stop();
    } else {
      setActive(false);
      setSeconds(0);
    }
  }, []);

  const togglePause = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;
    if (rec.state === "recording") {
      try {
        rec.pause();
        setPaused(true);
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
      } catch {
        /* ignore */
      }
    } else if (rec.state === "paused") {
      try {
        rec.resume();
        setPaused(false);
        if (!tickRef.current) {
          tickRef.current = setInterval(() => {
            setSeconds((s) => {
              const next = s + 1;
              durationRef.current = next;
              return next;
            });
          }, 1000);
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (active || saving) return;
    try {
      const { stream, cleanup } = await buildRecordingStream(
        includeMicRef.current,
        (msg) => onError?.(msg),
      );
      cleanupRef.current = cleanup;
      chunksRef.current = [];
      const { mimeType, ext } = pickScreenRecorderMime();
      mimeRef.current = { mimeType, ext };
      const rec = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        onError?.("Recording error.");
        stopTracks();
        setActive(false);
        setSaving(false);
      };
      rec.onstop = async () => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        setActive(false);
        setSeconds(0);

        const blob = new Blob(chunksRef.current, { type: mimeRef.current.mimeType });
        if (blob.size < 1) {
          onError?.(
            "No video data captured — keep the shared tab open until you stop.",
          );
          stopTracks();
          chunksRef.current = [];
          return;
        }

        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `lifenode-capture-${stamp}.${mimeRef.current.ext}`;
        const durationSec = Math.max(1, durationRef.current || 1);
        const usedMic = includeMicRef.current;

        setSaving(true);
        try {
          const record = await saveScreenCapture(blob, {
            filename,
            mimeType: mimeRef.current.mimeType,
            durationSec,
            includeMic: usedMic,
            clientId: readActiveClientSession(),
          });
          setLastSavedId(record.id);
          setReviewCaptureId(record.id);
          onSaved?.(record);
        } catch (e) {
          const msg =
            e instanceof DOMException && e.name === "QuotaExceededError"
              ? "Recording too large for this browser storage — try a shorter capture."
              : "Could not save capture locally.";
          onError?.(msg);
        } finally {
          setSaving(false);
          chunksRef.current = [];
        }
        stopTracks();
      };

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopRecording();
      });

      rec.start(1000);
      setActive(true);
      setPaused(false);
      setSeconds(0);
      durationRef.current = 0;
      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);
    } catch {
      onError?.("Screen capture was cancelled or not permitted.");
      stopTracks();
    }
  }, [active, saving, onError, onSaved, stopRecording, stopTracks]);

  return (
    <ScreenRecordingContext.Provider
      value={{
        active,
        paused,
        seconds,
        saving,
        includeMic,
        setIncludeMic,
        startRecording,
        stopRecording,
        togglePause,
        lastSavedId,
      }}
    >
      {children}
      <ScreenRecordingFloatingPill
        active={active}
        paused={paused}
        seconds={seconds}
        includeMic={includeMic}
        onTogglePause={togglePause}
        onStop={stopRecording}
      />
      <PostRecordReviewCard
        captureId={reviewCaptureId}
        onClose={() => setReviewCaptureId(null)}
      />
    </ScreenRecordingContext.Provider>
  );
}
