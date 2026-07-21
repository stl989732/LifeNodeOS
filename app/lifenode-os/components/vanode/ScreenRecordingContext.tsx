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
): Promise<{ stream: MediaStream; cleanup: () => void }> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const displayVideoTracks = displayStream.getVideoTracks();
  const displayAudioTracks = displayStream.getAudioTracks();

  let micStream: MediaStream | null = null;
  let cameraStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let rafId = 0;
  let canvasStream: MediaStream | null = null;
  const hiddenEls: HTMLElement[] = [];

  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    canvasStream?.getTracks().forEach((t) => t.stop());
    displayStream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    cameraStream?.getTracks().forEach((t) => t.stop());
    void audioContext?.close();
    hiddenEls.forEach((el) => el.remove());
  };

  const playHiddenVideo = async (media: MediaStream) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:0";
    video.srcObject = media;
    document.body.appendChild(video);
    hiddenEls.push(video);
    await video.play();
    return video;
  };

  const combinedTracks: MediaStreamTrack[] = [];

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

  if (cameraStream) {
    const screenVideo = await playHiddenVideo(
      new MediaStream(displayVideoTracks),
    );
    const cameraVideo = await playHiddenVideo(cameraStream);

    // Wait briefly for dimensions when the share just started.
    await new Promise((r) => window.setTimeout(r, 120));
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:0";
    document.body.appendChild(canvas);
    hiddenEls.push(canvas);

    const width = screenVideo.videoWidth || 1280;
    const height = screenVideo.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      displayVideoTracks.forEach((t) => combinedTracks.push(t));
      onWarning?.("Could not composite camera — recording screen only.");
    } else {
      const draw = () => {
        if (screenVideo.videoWidth > 0 && screenVideo.videoHeight > 0) {
          if (
            canvas.width !== screenVideo.videoWidth ||
            canvas.height !== screenVideo.videoHeight
          ) {
            canvas.width = screenVideo.videoWidth;
            canvas.height = screenVideo.videoHeight;
          }
        }
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

        const pipW = Math.max(120, Math.round(canvas.width * 0.2));
        const camAspect =
          (cameraVideo.videoWidth || 4) / (cameraVideo.videoHeight || 3);
        const pipH = Math.round(pipW / camAspect);
        const margin = Math.max(12, Math.round(canvas.width * 0.02));
        const x = canvas.width - pipW - margin;
        const y = canvas.height - pipH - margin;

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, pipW, pipH, 14);
        } else {
          ctx.rect(x, y, pipW, pipH);
        }
        ctx.closePath();
        ctx.clip();
        // Mirror webcam so it feels natural.
        ctx.translate(x + pipW, y);
        ctx.scale(-1, 1);
        ctx.drawImage(cameraVideo, 0, 0, pipW, pipH);
        ctx.restore();

        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = Math.max(2, Math.round(canvas.width * 0.0025));
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, pipW, pipH, 14);
        } else {
          ctx.rect(x, y, pipW, pipH);
        }
        ctx.stroke();

        rafId = requestAnimationFrame(draw);
      };
      draw();
      canvasStream = canvas.captureStream(30);
      canvasStream.getVideoTracks().forEach((t) => combinedTracks.push(t));
    }
  } else {
    displayVideoTracks.forEach((t) => combinedTracks.push(t));
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

  return { stream, cleanup };
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
      const { stream, cleanup } = await buildRecordingStream(
        includeMicRef.current,
        includeCameraRef.current,
        notifyWarning,
      );
      cleanupRef.current = cleanup;
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
        setActive(false);
        setSaving(false);
      };
      rec.onstop = async () => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        clearDraftInterval();
        setActive(false);
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
      <PostRecordReviewCard
        captureId={reviewCaptureId}
        onClose={() => setReviewCaptureId(null)}
      />
    </ScreenRecordingContext.Provider>
  );
}
