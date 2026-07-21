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
  normalizeCaptureBlob,
  listScreenCaptures,
  persistRecordingDraft,
  loadRecordingDraft,
  clearRecordingDraft,
  type ScreenCaptureRecord,
} from "@/lib/vanode/screenCaptureStorage";
import { usePlanEntitlementsOptional } from "@/src/context/PlanEntitlementsContext";
import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import {
  maxScreenRecordingSeconds,
  screenCaptureLimitMessage,
  screenCaptureLimitReached,
} from "@/src/lib/billing/screenCapturePlan";

type ScreenRecordingState = {
  active: boolean;
  paused: boolean;
  seconds: number;
  saving: boolean;
  includeMic: boolean;
  setIncludeMic: (v: boolean) => void;
  includeCamera: boolean;
  setIncludeCamera: (v: boolean) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  togglePause: () => void;
  lastSavedId: string | null;
  lastWarning: string | null;
  clearWarning: () => void;
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
  includeCamera,
  onTogglePause,
  onStop,
}: {
  active: boolean;
  paused: boolean;
  seconds: number;
  includeMic: boolean;
  includeCamera: boolean;
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
        {includeCamera && includeMic
          ? "Screen + cam + mic"
          : includeCamera
            ? "Screen + cam"
            : includeMic
              ? "Screen + mic"
              : "Screen"}{" "}
        · use Window share to hop nodes
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
  includeCamera: boolean,
  onWarning?: (message: string) => void,
): Promise<{
  stream: MediaStream;
  cleanup: () => void;
  cameraStream: MediaStream | null;
}> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const displayVideoTracks = displayStream.getVideoTracks();
  const displayAudioTracks = displayStream.getAudioTracks();

  let micStream: MediaStream | null = null;
  let cameraStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;

  const cleanup = () => {
    displayStream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    cameraStream?.getTracks().forEach((t) => t.stop());
    void audioContext?.close();
  };

  // Record the selected display surface directly. The camera is rendered once
  // as the draggable DOM self-view below, so sharing the LifeNode window or
  // entire screen captures that chosen position/shape without a second fixed
  // camera box being composited into the bottom-right corner.
  const combinedTracks: MediaStreamTrack[] = [...displayVideoTracks];

  if (includeCamera) {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
    } catch {
      onWarning?.(
        "Camera blocked or unavailable — recording screen only. Allow camera in site settings to include yourself.",
      );
      cameraStream = null;
    }
  }

  if (includeMic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      audioContext = new AudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
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
      onWarning?.(
        "Microphone blocked — recording screen with system/tab audio only.",
      );
    }
  } else {
    displayAudioTracks.forEach((t) => combinedTracks.push(t));
  }

  const stream = new MediaStream(combinedTracks);
  if (stream.getAudioTracks().length === 0 && includeMic) {
    onWarning?.(
      "No audio captured — enable “Share tab audio” in the browser picker and/or allow the microphone.",
    );
  }

  return { stream, cleanup, cameraStream };
}

type CameraPreviewShape = "circle" | "square";
type CameraPreviewSize = "small" | "large";

const CAMERA_PREVIEW_SHAPE_KEY = "lifenode.vanode.camera-preview-shape";
const CAMERA_PREVIEW_SIZE_KEY = "lifenode.vanode.camera-preview-size";

function readCameraPreviewPref<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return allowed.includes(raw as T) ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeCameraPreviewPref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Live self-view while recording with camera on — draggable, circle/square, two sizes. */
function FloatingCameraPreview({ stream }: { stream: MediaStream }) {
  const [shape, setShape] = useState<CameraPreviewShape>(() =>
    readCameraPreviewPref(CAMERA_PREVIEW_SHAPE_KEY, ["circle", "square"], "circle"),
  );
  const [size, setSize] = useState<CameraPreviewSize>(() =>
    readCameraPreviewPref(CAMERA_PREVIEW_SIZE_KEY, ["small", "large"], "small"),
  );
  const px = size === "small" ? 148 : 232;
  const { style, dragHandleProps } = useDraggableFloatingPosition(
    "lifenode.vanode.camera-preview",
    { width: px, height: px + 40 },
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  const pickShape = (next: CameraPreviewShape) => {
    setShape(next);
    writeCameraPreviewPref(CAMERA_PREVIEW_SHAPE_KEY, next);
  };
  const pickSize = (next: CameraPreviewSize) => {
    setSize(next);
    writeCameraPreviewPref(CAMERA_PREVIEW_SIZE_KEY, next);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed z-[5090] flex cursor-grab flex-col items-center gap-1.5 active:cursor-grabbing"
      style={{ left: style.left, top: style.top }}
      role="img"
      aria-label="Camera self-view while recording"
      {...dragHandleProps}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        width={px}
        height={px}
        className={`border-2 border-white/80 bg-slate-900 object-cover shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${
          shape === "circle" ? "rounded-full" : "rounded-2xl"
        }`}
        style={{
          width: px,
          height: px,
          transform: "scaleX(-1)",
        }}
      />
      <div
        className="flex items-center gap-1 rounded-full border border-white/25 bg-slate-900/85 px-2 py-1 shadow-lg backdrop-blur-md"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => pickShape("circle")}
          aria-label="Circle preview"
          title="Circle"
          className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition ${
            shape === "circle" ? "bg-teal-500/80" : "hover:bg-white/15"
          }`}
        >
          <span className="block h-3 w-3 rounded-full border-2 border-current" />
        </button>
        <button
          type="button"
          onClick={() => pickShape("square")}
          aria-label="Square preview"
          title="Square"
          className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition ${
            shape === "square" ? "bg-teal-500/80" : "hover:bg-white/15"
          }`}
        >
          <span className="block h-3 w-3 rounded-[3px] border-2 border-current" />
        </button>
        <span className="mx-0.5 h-4 w-px bg-white/25" aria-hidden />
        <button
          type="button"
          onClick={() => pickSize("small")}
          aria-label="Small preview"
          title="Small"
          className={`h-6 rounded-full px-1.5 text-[10px] font-bold text-white transition ${
            size === "small" ? "bg-teal-500/80" : "hover:bg-white/15"
          }`}
        >
          S
        </button>
        <button
          type="button"
          onClick={() => pickSize("large")}
          aria-label="Large preview"
          title="Large"
          className={`h-6 rounded-full px-1.5 text-[10px] font-bold text-white transition ${
            size === "large" ? "bg-teal-500/80" : "hover:bg-white/15"
          }`}
        >
          L
        </button>
      </div>
    </div>,
    document.body,
  );
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
  const planCtx = usePlanEntitlementsOptional();
  const entitlements =
    planCtx?.entitlements ?? getPlanEntitlements(planCtx?.plan ?? "core");
  const maxRecordingSeconds = maxScreenRecordingSeconds(entitlements);
  const maxRecordingSecondsRef = useRef(maxRecordingSeconds);

  useEffect(() => {
    maxRecordingSecondsRef.current = maxScreenRecordingSeconds(entitlements);
  }, [entitlements]);

  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [includeMic, setIncludeMic] = useState(true);
  const [includeCamera, setIncludeCamera] = useState(false);
  const [cameraPreviewStream, setCameraPreviewStream] =
    useState<MediaStream | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const [reviewCaptureId, setReviewCaptureIdState] = useState<string | null>(
    () => readReviewCaptureId(),
  );

  const setReviewCaptureId = useCallback((id: string | null) => {
    setReviewCaptureIdState(id);
    writeReviewCaptureId(id);
  }, []);

  const clearWarning = useCallback(() => setLastWarning(null), []);

  const notifyWarning = useCallback(
    (message: string) => {
      setLastWarning(message);
      onError?.(message);
    },
    [onError],
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef(false);
  const durationRef = useRef(0);
  const includeMicRef = useRef(includeMic);
  const includeCameraRef = useRef(includeCamera);
  const mimeRef = useRef({ mimeType: "video/webm", ext: "webm" });
  const savingRef = useRef(false);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  const clearDraftInterval = useCallback(() => {
    if (draftRef.current) clearInterval(draftRef.current);
    draftRef.current = null;
  }, []);

  const persistDraftFromChunks = useCallback(async () => {
    if (chunksRef.current.length < 1) return;
    const rawBlob = new Blob(chunksRef.current, {
      type: mimeRef.current.mimeType,
    });
    const blob = normalizeCaptureBlob(rawBlob, mimeRef.current.mimeType);
    await persistRecordingDraft(blob, {
      mimeType: mimeRef.current.mimeType,
      durationSec: Math.max(1, durationRef.current || 1),
      includeMic: includeMicRef.current,
      clientId: readActiveClientSession(),
    });
  }, []);

  const finalizeCapture = useCallback(
    async (blob: Blob, options?: { autoStopped?: boolean }) => {
      if (blob.size < 512) {
        const draft = await loadRecordingDraft();
        if (draft && draft.blob.size >= 512) {
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const ext = draft.meta.mimeType.includes("mp4") ? "mp4" : "webm";
          const record = await saveScreenCapture(
            normalizeCaptureBlob(draft.blob, draft.meta.mimeType),
            {
              filename: `lifenode-capture-${stamp}.${ext}`,
              mimeType: draft.meta.mimeType,
              durationSec: draft.meta.durationSec,
              includeMic: draft.meta.includeMic,
              clientId: draft.meta.clientId ?? readActiveClientSession(),
            },
          );
          setLastSavedId(record.id);
          setReviewCaptureId(record.id);
          onSaved?.(record);
          notifyWarning(
            "Screen share ended early — recovered your capture from backup. Open VANode → EOD proof of work → Saved on this device.",
          );
          return;
        }
        onError?.(
          options?.autoStopped
            ? "Screen share ended before any video was saved — pick Window or Entire screen (not Tab) when switching LifeNode areas."
            : "No video data captured — keep the shared surface open until you stop.",
        );
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
        if (options?.autoStopped) {
          notifyWarning(
            "Recording auto-saved after screen share ended. Find it in VANode → EOD proof of work → Saved on this device.",
          );
        }
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
    },
    [notifyWarning, onError, onSaved, setReviewCaptureId],
  );

  useEffect(() => {
    includeMicRef.current = includeMic;
  }, [includeMic]);

  useEffect(() => {
    includeCameraRef.current = includeCamera;
  }, [includeCamera]);

  const stopTracks = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      clearDraftInterval();
    };
  }, [clearDraftInterval]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const draft = await loadRecordingDraft();
      if (cancelled || !draft || draft.blob.size < 512) return;
      await finalizeCapture(
        normalizeCaptureBlob(draft.blob, draft.meta.mimeType),
        { autoStopped: true },
      );
    })();
    return () => {
      cancelled = true;
    };
    // Recover interrupted recordings once per app load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    clearDraftInterval();
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
  }, [clearDraftInterval]);

  const beginDurationTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        durationRef.current = next;
        if (next >= maxRecordingSecondsRef.current) {
          stopRecording();
          notifyWarning(
            `Recording stopped at ${entitlements.maxScreenCaptureMinutes} minutes — your plan limit per session.`,
          );
        }
        return next;
      });
    }, 1000);
  }, [entitlements.maxScreenCaptureMinutes, notifyWarning, stopRecording]);

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
          beginDurationTick();
        }
      } catch {
        /* ignore */
      }
    }
  }, [beginDurationTick]);

  const startRecording = useCallback(async () => {
    if (active || saving) return;

    const existing = await listScreenCaptures();
    if (screenCaptureLimitReached(entitlements, existing)) {
      const message = screenCaptureLimitMessage(entitlements.displayName);
      notifyWarning(message);
      planCtx?.promptUpgradeMessage({
        title: "EOD screen recording limit",
        message,
      });
      return;
    }

    try {
      const { stream, cleanup, cameraStream } = await buildRecordingStream(
        includeMicRef.current,
        includeCameraRef.current,
        notifyWarning,
      );
      cleanupRef.current = cleanup;
      setCameraPreviewStream(cameraStream);
      chunksRef.current = [];
      const hasAudio = stream.getAudioTracks().length > 0;
      const { mimeType, ext } = pickScreenRecorderMime(hasAudio);
      mimeRef.current = { mimeType, ext };
      const rec = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: hasAudio ? 128_000 : undefined,
        videoBitsPerSecond: 2_500_000,
      });
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        onError?.("Recording error.");
        stopTracks();
        setCameraPreviewStream(null);
        setActive(false);
        setSaving(false);
      };
      rec.onstop = async () => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        clearDraftInterval();
        setActive(false);
        setCameraPreviewStream(null);
        setSeconds(0);

        const rawBlob = new Blob(chunksRef.current, {
          type: mimeRef.current.mimeType,
        });
        const blob = normalizeCaptureBlob(rawBlob, mimeRef.current.mimeType);
        const autoStopped = autoStopRef.current;
        autoStopRef.current = false;
        await finalizeCapture(blob, { autoStopped });
        stopTracks();
      };

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (savingRef.current) return;
        autoStopRef.current = true;
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== "inactive") {
          try {
            rec.requestData();
          } catch {
            /* ignore */
          }
          window.setTimeout(() => stopRecording(), 300);
          return;
        }
        stopRecording();
      });

      rec.start(1000);
      setActive(true);
      setPaused(false);
      setSeconds(0);
      durationRef.current = 0;
      autoStopRef.current = false;
      void clearRecordingDraft();
      beginDurationTick();
      clearDraftInterval();
      draftRef.current = setInterval(() => {
        void persistDraftFromChunks();
      }, 12_000);
    } catch {
      onError?.("Screen capture was cancelled or not permitted.");
      stopTracks();
      setCameraPreviewStream(null);
    }
  }, [
    active,
    saving,
    entitlements,
    notifyWarning,
    planCtx,
    onSaved,
    onError,
    stopRecording,
    stopTracks,
    beginDurationTick,
    setReviewCaptureId,
    clearDraftInterval,
    persistDraftFromChunks,
    finalizeCapture,
  ]);

  return (
    <ScreenRecordingContext.Provider
      value={{
        active,
        paused,
        seconds,
        saving,
        includeMic,
        setIncludeMic,
        includeCamera,
        setIncludeCamera,
        startRecording,
        stopRecording,
        togglePause,
        lastSavedId,
        lastWarning,
        clearWarning,
      }}
    >
      {children}
      <ScreenRecordingFloatingPill
        active={active}
        paused={paused}
        seconds={seconds}
        includeMic={includeMic}
        includeCamera={includeCamera}
        onTogglePause={togglePause}
        onStop={stopRecording}
      />
      {active && cameraPreviewStream ? (
        <FloatingCameraPreview stream={cameraPreviewStream} />
      ) : null}
      <PostRecordReviewCard
        captureId={reviewCaptureId}
        onClose={() => setReviewCaptureId(null)}
      />
    </ScreenRecordingContext.Provider>
  );
}
