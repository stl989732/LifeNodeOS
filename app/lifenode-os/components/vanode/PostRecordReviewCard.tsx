"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Minus,
  Share2,
  X,
} from "lucide-react";
import {
  downloadScreenCapture,
  getScreenCaptureBlob,
  listScreenCaptures,
  normalizeCaptureBlob,
  shareScreenCapture,
  type ScreenCaptureRecord,
} from "@/lib/vanode/screenCaptureStorage";
import { remuxBlobToMp4 } from "@/lib/vanode/videoMp4Export";
import { trimVideoBlob } from "@/lib/vanode/trimVideoBlob";
import { fixCaptureBlobDuration } from "@/lib/vanode/fixCaptureBlobDuration";
import { useDraggableFloatingPosition } from "@/src/components/vanode/useDraggableFloatingPosition";
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";
import { screenCaptureDownloadBlockedMessage } from "@/src/lib/billing/screenCapturePlan";

type Props = {
  captureId: string | null;
  onClose: () => void;
  onToast?: (message: string) => void;
};

export function PostRecordReviewCard({ captureId, onClose, onToast }: Props) {
  const { entitlements, promptUpgradeMessage } = usePlanEntitlements();
  const downloadsAllowed = entitlements.screenCapturesDownloadable;
  const [record, setRecord] = useState<ScreenCaptureRecord | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [mp4Exporting, setMp4Exporting] = useState(false);
  const [playError, setPlayError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const loadedBlobRef = useRef<{ captureId: string; size: number } | null>(null);
  const blobUrlKeyRef = useRef<string | null>(null);

  const { position, style, dragHandleProps } = useDraggableFloatingPosition(
    "lifenode.vanode.post-record-review",
    { width: 420, height: minimized ? 48 : 380 },
  );

  const syncTrimFromVideo = useCallback((video: HTMLVideoElement) => {
    const d = video.duration;
    if (Number.isFinite(d) && d > 0) {
      setDuration(d);
      setTrimEnd(d);
    }
  }, []);

  useEffect(() => {
    if (!captureId) {
      setRecord(null);
      setBlob(null);
      loadedBlobRef.current = null;
      blobUrlKeyRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const rows = await listScreenCaptures();
      const row = rows.find((r) => r.id === captureId) ?? null;
      const b = row ? await getScreenCaptureBlob(captureId) : null;
      if (cancelled) return;
      if (
        b &&
        loadedBlobRef.current?.captureId === captureId &&
        loadedBlobRef.current?.size === b.size
      ) {
        return;
      }
      loadedBlobRef.current = b ? { captureId, size: b.size } : null;
      setRecord(row);
      setBlob(b);
      if (row) {
        setTrimStart(0);
        setTrimEnd(row.durationSec);
        setDuration(row.durationSec);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [captureId]);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
        videoUrlRef.current = null;
      }
      blobUrlKeyRef.current = null;
    };
  }, [captureId]);

  useEffect(() => {
    if (!blob || !captureId) {
      setVideoUrl(null);
      setPlayError(false);
      return;
    }

    let cancelled = false;
    const mimeType = record?.mimeType || blob.type || "video/webm";
    const durationHint = record?.durationSec ?? 0;
    const urlKey = `${captureId}:${blob.size}:${mimeType}:${durationHint}`;

    void (async () => {
      if (blobUrlKeyRef.current === urlKey && videoUrlRef.current) {
        if (!cancelled) setVideoUrl(videoUrlRef.current);
        return;
      }
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
        videoUrlRef.current = null;
      }
      setPlayError(false);
      const typed = normalizeCaptureBlob(blob, mimeType);
      const playable =
        durationHint > 0
          ? await fixCaptureBlobDuration(typed, durationHint, mimeType)
          : typed;
      if (cancelled) return;
      const url = URL.createObjectURL(playable);
      blobUrlKeyRef.current = urlKey;
      videoUrlRef.current = url;
      setVideoUrl(url);
    })();

    return () => {
      cancelled = true;
    };
  }, [blob, captureId, record?.durationSec, record?.mimeType]);

  const requireDownloadAccess = useCallback(() => {
    if (downloadsAllowed) return true;
    const message = screenCaptureDownloadBlockedMessage(entitlements.displayName);
    onToast?.(message);
    promptUpgradeMessage({
      title: "Download recordings",
      message,
    });
    return false;
  }, [downloadsAllowed, entitlements.displayName, onToast, promptUpgradeMessage]);

  const handleDownloadMp4 = useCallback(async () => {
    if (!blob || !record) return;
    if (!requireDownloadAccess()) return;
    const mimeType = record.mimeType || blob.type || "video/webm";
    const typed = normalizeCaptureBlob(blob, mimeType);
    const isMp4 =
      mimeType.includes("mp4") || record.filename.toLowerCase().endsWith(".mp4");
    const name = record.filename.replace(/\.[^.]+$/, "") + ".mp4";
    if (isMp4) {
      downloadScreenCapture(typed, name);
      onToast?.("Download started.");
      return;
    }
    setMp4Exporting(true);
    try {
      onToast?.("Preparing MP4 — about as long as the clip.");
      const mp4 = await remuxBlobToMp4(typed);
      downloadScreenCapture(mp4, name);
      onToast?.("MP4 download started.");
    } catch {
      onToast?.("MP4 export failed — use Download for WebM.");
    } finally {
      setMp4Exporting(false);
    }
  }, [blob, onToast, record, requireDownloadAccess]);

  const canTrim = useMemo(
    () => duration > 1 && trimEnd - trimStart >= 0.5,
    [duration, trimEnd, trimStart],
  );

  const handleShare = useCallback(async () => {
    if (!blob || !record) return;
    if (!requireDownloadAccess()) return;
    const result = await shareScreenCapture(blob, record.filename);
    if (result === "shared") onToast?.("Shared via your device.");
    else if (result === "downloaded")
      onToast?.("Share not supported here — download started instead.");
    else if (result === "cancelled") onToast?.("Share cancelled.");
    else onToast?.("Could not share — try Download.");
  }, [blob, onToast, record, requireDownloadAccess]);

  const handleDownload = useCallback(() => {
    if (!blob || !record) return;
    if (!requireDownloadAccess()) return;
    const typed = normalizeCaptureBlob(
      blob,
      record.mimeType || blob.type || "video/webm",
    );
    downloadScreenCapture(typed, record.filename);
    onToast?.("Download started.");
  }, [blob, onToast, record, requireDownloadAccess]);

  const handleApplyTrim = useCallback(async () => {
    if (!blob || !record || !canTrim) return;
    if (!requireDownloadAccess()) return;
    setTrimming(true);
    try {
      const trimmed = await trimVideoBlob(
        blob,
        trimStart,
        trimEnd,
        record.mimeType,
      );
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const name = record.filename.replace(/(\.[^.]+)?$/, `-trim-${stamp}$1`);
      downloadScreenCapture(trimmed, name);
      onToast?.("Trimmed clip downloaded.");
    } catch {
      onToast?.("Could not trim this capture in the browser — try Download.");
    } finally {
      setTrimming(false);
    }
  }, [blob, canTrim, onToast, record, requireDownloadAccess, trimEnd, trimStart]);

  if (!captureId || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed z-[5200] w-[min(420px,calc(100vw-1rem))] rounded-2xl border border-teal-400/40 bg-slate-900/92 text-white shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      style={{ left: style.left, top: style.top }}
      role="dialog"
      aria-label="Recording review"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div
          className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
          {...dragHandleProps}
        >
          <p className="truncate text-xs font-bold uppercase tracking-wide text-teal-200">
            Recording saved
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMinimized((m) => !m)}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
            aria-label={minimized ? "Expand" : "Minimize"}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized ? (
        <div className="space-y-3 p-3">
          {videoUrl ? (
            <video
              key={captureId}
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              preload="auto"
              className="max-h-48 w-full rounded-xl bg-black"
              onError={() => setPlayError(true)}
              onLoadedMetadata={(e) => syncTrimFromVideo(e.currentTarget)}
              onDurationChange={(e) => syncTrimFromVideo(e.currentTarget)}
            />
          ) : (
            <p className="text-xs text-white/60">Loading preview…</p>
          )}
          {playError ? (
            <p className="text-xs text-amber-200/90">
              Preview unavailable in this browser — use Download or open from
              Saved on this device below.
            </p>
          ) : null}

          {duration > 0 ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
                Trim clip
              </p>
              <label className="block text-[10px] text-white/70">
                Start (sec)
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, duration - 0.5)}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTrimStart(v);
                    if (v >= trimEnd) setTrimEnd(Math.min(duration, v + 0.5));
                  }}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-[10px] text-white/70">
                End (sec)
                <input
                  type="range"
                  min={Math.min(duration, trimStart + 0.5)}
                  max={duration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <button
                type="button"
                disabled={!canTrim || trimming}
                onClick={() => void handleApplyTrim()}
                className="rounded-lg bg-teal-500/25 px-3 py-1.5 text-xs font-bold text-teal-100 hover:bg-teal-500/35 disabled:opacity-40"
              >
                {trimming ? "Trimming…" : "Export trimmed clip"}
              </button>
            </div>
          ) : null}

          {downloadsAllowed ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5" />
                WebM
              </button>
              <button
                type="button"
                disabled={mp4Exporting}
                onClick={() => void handleDownloadMp4()}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {mp4Exporting ? "MP4…" : "MP4"}
              </button>
              <button
                type="button"
                onClick={() => void handleShare()}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-white/50">
              Watch here on Core — upgrade to Sync or Nexus to download and share.
            </p>
          )}
          {record ? (
            <p className="truncate text-[10px] text-white/50">{record.filename}</p>
          ) : null}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
