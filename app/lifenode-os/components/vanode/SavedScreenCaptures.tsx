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

  const handleDownload = async (row: ScreenCaptureRecord) => {
    const blob = await getScreenCaptureBlob(row.id);
    if (!blob) {
      onToast?.("Capture file missing — it may have been cleared from this browser.");
      return;
    }
    downloadScreenCapture(blob, row.filename);
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
        Finished recordings appear here as video files (MP4 or WebM) — download or
        share to social platforms.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
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
              {row.mimeType.includes("mp4") ? "MP4" : "WebM"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Download video"
              onClick={() => void handleDownload(row)}
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
      ))}
    </ul>
  );
}
