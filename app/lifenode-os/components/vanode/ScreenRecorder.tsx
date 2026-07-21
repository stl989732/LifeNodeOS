"use client";

import { Camera, CameraOff, Circle, Mic, MicOff, Square } from "lucide-react";
import { useEffect } from "react";
import { useScreenRecording } from "./ScreenRecordingContext";
import { usePlanEntitlementsOptional } from "@/src/context/PlanEntitlementsContext";
import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { screenCaptureLimitLabel } from "@/src/lib/billing/screenCapturePlan";

type Props = {
  onError?: (message: string) => void;
};

export function ScreenRecorder({ onError }: Props) {
  const {
    active,
    seconds,
    saving,
    includeMic,
    setIncludeMic,
    includeCamera,
    setIncludeCamera,
    startRecording,
    stopRecording,
    lastSavedId,
    lastWarning,
    clearWarning,
  } = useScreenRecording();

  const planCtx = usePlanEntitlementsOptional();
  const entitlements =
    planCtx?.entitlements ?? getPlanEntitlements(planCtx?.plan ?? "core");
  const captureLimit = screenCaptureLimitLabel(entitlements);

  useEffect(() => {
    if (!lastWarning) return;
    onError?.(lastWarning);
    clearWarning();
  }, [lastWarning, onError, clearWarning]);

  const statusBits = [
    includeCamera ? "cam on" : null,
    includeMic ? "mic on" : "screen only",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-teal-600"
          checked={includeMic}
          disabled={active || saving}
          onChange={(e) => setIncludeMic(e.target.checked)}
        />
        {includeMic ? (
          <Mic className="h-4 w-4 text-teal-600" aria-hidden />
        ) : (
          <MicOff className="h-4 w-4 text-slate-400" aria-hidden />
        )}
        <span>
          Include microphone{" "}
          <span className="text-xs text-slate-500">
            (narrate while you record)
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-teal-600"
          checked={includeCamera}
          disabled={active || saving}
          onChange={(e) => setIncludeCamera(e.target.checked)}
        />
        {includeCamera ? (
          <Camera className="h-4 w-4 text-teal-600" aria-hidden />
        ) : (
          <CameraOff className="h-4 w-4 text-slate-400" aria-hidden />
        )}
        <span>
          Include camera{" "}
          <span className="text-xs text-slate-500">
            (webcam picture-in-picture in the recording — off by default)
          </span>
        </span>
      </label>
      <p className="text-xs text-slate-500">
        Recording keeps running when you open other LifeNode areas. In the browser
        picker, choose <strong>Window</strong> or <strong>Entire screen</strong>{" "}
        (not <strong>Tab</strong>) if you plan to hop nodes — Tab share often stops
        when you leave VANode. Enable <strong>Share tab audio</strong> for system
        sound. Turn on <strong>Include camera</strong> only when you want your face
        in the corner of the capture (browser will ask for camera permission). Use
        the floating pill to stop. {captureLimit}.{" "}
        {entitlements.maxScreenCaptureMinutes}-minute max per session. Captures
        auto-save to VANode → EOD proof of work → Saved on this device.
        {entitlements.screenCapturesDownloadable
          ? " Download WebM or MP4 from there."
          : " On Core, review in the browser only — downloads unlock on Sync."}
      </p>
      {lastSavedId ? (
        <p className="text-xs text-teal-700">
          Latest capture is ready — check the floating review card or Saved on this
          device below.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void (active
              ? stopRecording()
              : startRecording().catch(() =>
                  onError?.("Could not start recording."),
                ))
          }
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-500 disabled:opacity-50"
        >
          {active ? (
            <>
              <Square className="h-4 w-4 fill-current" strokeWidth={0} />
              Stop recording
            </>
          ) : (
            <>
              <Circle className="h-4 w-4 fill-red-500 text-red-500" />
              {saving ? "Saving…" : "Record screen"}
            </>
          )}
        </button>
        {active && (
          <span className="text-xs font-medium tabular-nums text-slate-600">
            {Math.floor(seconds / 60)
              .toString()
              .padStart(2, "0")}
            :{(seconds % 60).toString().padStart(2, "0")}
            {" · "}
            {statusBits.join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}
