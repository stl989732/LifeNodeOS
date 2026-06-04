"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share2, Trash2 } from "lucide-react";
import {
  deleteScreenCapture,
  downloadScreenCapture,
  formatCaptureSize,
  getScreenCaptureBlob,
  listScreenCaptures,
  shareScreenCapture,
  type ScreenCaptureRecord,
} from "@/lib/vanode/screenCaptureStorage";

type Props = {
  refreshKey?: number;
  onToast?: (message: string) => void;
};

function downloadAs(blob: Blob, filename: string) {
  downloadScreenCapture(blob, filename);
}

export function SavedScreenCaptures({ refreshKey = 0, onToast }: Props) {
  const [rows, setRows] = useState<ScreenCaptureRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDownload = async (
    row: ScreenCaptureRecord,
    format: "native" | "mp4" | "webm",
  ) => {
    const blob = await getScreenCaptureBlob(row.id);
    if (!blob) {
      onToast?.("Capture file missing — it may have been cleared from this browser.");
      return;
    }
    const isMp4 =
      row.mimeType.includes("mp4") || row.filename.toLowerCase().endsWith(".mp4");
    if (format === "native") {
      downloadAs(blob, row.filename);
    } else if (format === "mp4") {
      const name = row.filename.replace(/\.[^.]+$/, "") + ".mp4";
      if (isMp4) {
        downloadAs(blob, name);
      } else {
        onToast?.(
          "This recording was saved as WebM (your browser did not support MP4 capture). Use Download WebM.",
        );
        return;
      }
    } else {
      const name = row.filename.replace(/\.[^.]+$/, "") + ".webm";
      if (!isMp4) {
        downloadAs(blob, name);
      } else {
        downloadAs(blob, row.filename);
      }
    }
    onToast?.("Download started.");
  };

  const handleShare = async (row: ScreenCaptureRecord) => {
    const blob = await getScreenCaptureBlob(row.id);
    if (!blob) {
      onToast?.("Capture file missing.");
      return;
    }
    const result = await shareScreenCapture(blob, row.filename);
    if (result === "shared") onToast?.("Shared via your device.");
    else if (result === "unsupported")
      onToast?.("Sharing not supported here — use Download instead.");
    else onToast?.("Share cancelled.");
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

  if (rows.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Finished recordings appear here as video files — download WebM or MP4
        (when supported) anytime; files stay until you delete them.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const isMp4 =
          row.mimeType.includes("mp4") ||
          row.filename.toLowerCase().endsWith(".mp4");
        return (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
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
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1">
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
                title={
                  isMp4
                    ? "Download MP4"
                    : "MP4 not available for this capture"
                }
                onClick={() => void handleDownload(row, "mp4")}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-teal-50 disabled:opacity-40"
                disabled={!isMp4}
              >
                MP4
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
  );
}
