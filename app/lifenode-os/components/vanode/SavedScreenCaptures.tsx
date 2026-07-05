"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Cloud, Download, Play, Share2, Trash2, X } from "lucide-react";
import { useActiveClientOptional } from "./ActiveClientContext";
import {
  deleteScreenCapture,
  downloadScreenCapture,
  formatCaptureSize,
  getScreenCaptureBlob,
  listScreenCaptures,
  normalizeCaptureBlob,
  shareScreenCapture,
  type ScreenCaptureRecord,
} from "@/lib/vanode/screenCaptureStorage";
import { remuxBlobToMp4 } from "@/lib/vanode/videoMp4Export";
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";
import { screenCaptureDownloadBlockedMessage } from "@/src/lib/billing/screenCapturePlan";

type Props = {
  refreshKey?: number;
  onToast?: (message: string) => void;
};

function downloadAs(blob: Blob, filename: string) {
  downloadScreenCapture(blob, filename);
}

export function SavedScreenCaptures({ refreshKey = 0, onToast }: Props) {
  const active = useActiveClientOptional();
  const { entitlements, promptUpgradeMessage } = usePlanEntitlements();
  const downloadsAllowed = entitlements.screenCapturesDownloadable;
  const activeClientId = active?.activeClientId ?? null;
  const [rows, setRows] = useState<ScreenCaptureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingRow, setPlayingRow] = useState<ScreenCaptureRecord | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [mp4Exporting, setMp4Exporting] = useState(false);
  const playUrlRef = useRef<string | null>(null);

  const visibleRows = useMemo(() => {
    if (!activeClientId) return rows;
    return rows.filter(
      (r) => r.clientId === activeClientId || r.clientId == null,
    );
  }, [rows, activeClientId]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listScreenCaptures());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  useEffect(() => {
    if (!playingRow) {
      if (playUrlRef.current) {
        URL.revokeObjectURL(playUrlRef.current);
        playUrlRef.current = null;
      }
      setPlayUrl(null);
      setPlayError(false);
      setPlayLoading(false);
      return;
    }
    let cancelled = false;
    setPlayLoading(true);
    setPlayError(false);
    void getScreenCaptureBlob(playingRow.id).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        onToast?.("Video file missing — try downloading instead.");
        setPlayingRow(null);
        setPlayLoading(false);
        return;
      }
      if (playUrlRef.current) URL.revokeObjectURL(playUrlRef.current);
      const mimeType =
        playingRow.mimeType ||
        (playingRow.filename.toLowerCase().endsWith(".mp4")
          ? "video/mp4"
          : "video/webm");
      const typedBlob = normalizeCaptureBlob(blob, mimeType);
      const objectUrl = URL.createObjectURL(typedBlob);
      playUrlRef.current = objectUrl;
      setPlayUrl(objectUrl);
      setPlayLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [onToast, playingRow]);

  useEffect(() => {
    return () => {
      if (playUrlRef.current) {
        URL.revokeObjectURL(playUrlRef.current);
        playUrlRef.current = null;
      }
    };
  }, []);

  const handlePlay = (row: ScreenCaptureRecord) => {
    setPlayingRow(row);
  };

  const closePlayer = () => {
    if (playUrlRef.current) {
      URL.revokeObjectURL(playUrlRef.current);
      playUrlRef.current = null;
    }
    setPlayingRow(null);
    setPlayUrl(null);
    setPlayError(false);
  };

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

  const handleDownload = async (
    row: ScreenCaptureRecord,
    format: "native" | "mp4" | "webm",
  ) => {
    if (!requireDownloadAccess()) return;
    const blob = await getScreenCaptureBlob(row.id);
    if (!blob) {
      onToast?.("Capture file missing — it may have been cleared from this browser.");
      return;
    }
    const mimeType = row.mimeType || blob.type || "video/webm";
    const typed = normalizeCaptureBlob(blob, mimeType);
    const isMp4 =
      mimeType.includes("mp4") || row.filename.toLowerCase().endsWith(".mp4");
    if (format === "native") {
      downloadAs(typed, row.filename);
    } else if (format === "mp4") {
      const name = row.filename.replace(/\.[^.]+$/, "") + ".mp4";
      if (isMp4) {
        downloadAs(typed, name);
      } else {
        setMp4Exporting(true);
        try {
          onToast?.("Preparing MP4 — this takes about as long as the clip length.");
          const mp4 = await remuxBlobToMp4(typed);
          downloadAs(mp4, name);
        } catch {
          onToast?.("MP4 export failed — try WebM download (audio is preserved).");
          return;
        } finally {
          setMp4Exporting(false);
        }
      }
    } else {
      const name = row.filename.replace(/\.[^.]+$/, "") + ".webm";
      if (!isMp4) {
        downloadAs(typed, name);
      } else {
        downloadAs(typed, row.filename);
      }
    }
    onToast?.("Download started.");
  };

  const handleShare = async (row: ScreenCaptureRecord) => {
    if (!requireDownloadAccess()) return;
    const blob = await getScreenCaptureBlob(row.id);
    if (!blob) {
      onToast?.("Capture file missing.");
      return;
    }
    const result = await shareScreenCapture(blob, row.filename);
    if (result === "shared") onToast?.("Shared via your device.");
    else if (result === "downloaded")
      onToast?.("Share not supported here — download started instead.");
    else if (result === "cancelled") onToast?.("Share cancelled.");
    else onToast?.("Could not share — try Download.");
  };

  const handleDelete = async (row: ScreenCaptureRecord) => {
    await deleteScreenCapture(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    onToast?.("Capture removed from this device.");
  };

  if (loading && rows.length === 0) {
    return (
      <p className="text-xs text-slate-500">Loading saved captures…</p>
    );
  }

  if (visibleRows.length === 0 && !loading) {
    return (
      <p className="text-xs text-slate-500">
        Finished recordings appear here — watch in the browser anytime.
        {downloadsAllowed
          ? " Download WebM or MP4 from the list."
          : " Downloads unlock on Sync and Nexus."}
      </p>
    );
  }

  return (
    <>
    <ul className="space-y-2">
      {visibleRows.map((row) => {
        const isMp4 =
          row.mimeType.includes("mp4") ||
          row.filename.toLowerCase().endsWith(".mp4");
        return (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/60 px-3 py-2"
          >
            <button
              type="button"
              onClick={() => handlePlay(row)}
              className="min-w-0 flex-1 text-left hover:opacity-90"
              title="Watch capture"
            >
              <p className="truncate text-sm font-medium text-slate-800">
                {row.filename}
              </p>
              <p className="text-[11px] text-slate-500">
                {new Date(row.createdAt).toLocaleString()} ·{" "}
                {formatCaptureSize(row.sizeBytes)} ·{" "}
                {row.durationSec >= 60
                  ? `${Math.floor(row.durationSec / 60)}m ${row.durationSec % 60}s`
                  : `${row.durationSec}s`}
                {row.includeMic ? " · mic" : ""} ·{" "}
                {isMp4 ? "MP4" : "WebM"}
                {row.cloudSynced ? (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-teal-700">
                    <Cloud className="inline h-3 w-3" />
                    cloud
                  </span>
                ) : null}
              </p>
            </button>
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <button
                type="button"
                title="Watch"
                onClick={() => handlePlay(row)}
                className="rounded-lg border border-teal-200 px-2 py-1 text-[10px] font-bold text-teal-800 hover:bg-teal-50"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
              {downloadsAllowed ? (
                <>
                  <button
                    type="button"
                    title="Download WebM"
                    onClick={() => void handleDownload(row, "webm")}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-teal-50"
                  >
                    WebM
                  </button>
                  <button
                    type="button"
                    title="Download MP4 (converts WebM when needed)"
                    disabled={mp4Exporting}
                    onClick={() => void handleDownload(row, "mp4")}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-teal-50 disabled:opacity-40"
                  >
                    {mp4Exporting ? "…" : "MP4"}
                  </button>
                  <button
                    type="button"
                    title="Download original file"
                    onClick={() => void handleDownload(row, "native")}
                    className="rounded-lg p-2 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Share to apps"
                    onClick={() => void handleShare(row)}
                    className="rounded-lg p-2 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                title="Delete from this device"
                onClick={() => void handleDelete(row)}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
    {playingRow && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[5300] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-label="Watch screen capture"
            onClick={closePlayer}
          >
            <div
              className="relative w-full max-w-3xl rounded-2xl border border-white/20 bg-slate-900 p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closePlayer}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10"
                aria-label="Close player"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="mb-3 truncate pr-10 text-sm font-semibold text-white">
                {playingRow.filename}
              </p>
              {playLoading || !playUrl ? (
                <p className="py-12 text-center text-sm text-white/60">
                  Loading video…
                </p>
              ) : (
                <>
                  <video
                    key={playUrl}
                    controls
                    playsInline
                    autoPlay
                    preload="metadata"
                    className="max-h-[70vh] w-full rounded-xl bg-black"
                    onError={() => setPlayError(true)}
                  >
                    <source
                      src={playUrl}
                      type={
                        playingRow.mimeType ||
                        (playingRow.filename.toLowerCase().endsWith(".mp4")
                          ? "video/mp4"
                          : "video/webm")
                      }
                    />
                  </video>
                  {playError ? (
                    <p className="mt-3 text-center text-sm text-amber-200/90">
                      This browser cannot play this format inline — use WebM or
                      MP4 download from the list.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}
