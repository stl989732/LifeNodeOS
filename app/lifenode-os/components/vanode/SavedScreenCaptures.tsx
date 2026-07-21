"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Cloud,
  Download,
  Link2,
  MoreVertical,
  Pencil,
  Play,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useActiveClientOptional } from "./ActiveClientContext";
import {
  deleteScreenCapture,
  downloadScreenCapture,
  formatCaptureSize,
  getScreenCaptureBlob,
  listScreenCaptures,
  normalizeCaptureBlob,
  renameScreenCapture,
  shareScreenCapture,
  type ScreenCaptureRecord,
} from "@/lib/vanode/screenCaptureStorage";
import { remuxBlobToMp4 } from "@/lib/vanode/videoMp4Export";
import { fixCaptureBlobDuration } from "@/lib/vanode/fixCaptureBlobDuration";
import { createScreenCaptureShareLink } from "@/lib/vanode/screenCaptureSync";
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
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const playUrlRef = useRef<string | null>(null);
  const playingRowRef = useRef<ScreenCaptureRecord | null>(null);
  const loadedPlayRef = useRef<{ id: string; size: number } | null>(null);

  useEffect(() => {
    playingRowRef.current = playingRow;
  }, [playingRow]);

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest("[data-capture-menu]")) {
        setOpenMenuId(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

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
      if (document.visibilityState === "visible" && !playingRowRef.current) {
        void reload();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  useEffect(() => {
    const playingId = playingRow?.id ?? null;
    if (!playingRow || !playingId) {
      if (playUrlRef.current) {
        URL.revokeObjectURL(playUrlRef.current);
        playUrlRef.current = null;
      }
      loadedPlayRef.current = null;
      setPlayUrl(null);
      setPlayError(false);
      setPlayLoading(false);
      return;
    }
    let cancelled = false;
    setPlayLoading(true);
    setPlayError(false);
    void getScreenCaptureBlob(playingId).then(async (blob) => {
      if (cancelled) return;
      if (!blob) {
        onToast?.("Video file missing — try downloading instead.");
        setPlayingRow(null);
        setPlayLoading(false);
        return;
      }
      if (
        loadedPlayRef.current?.id === playingId &&
        loadedPlayRef.current?.size === blob.size &&
        playUrlRef.current
      ) {
        setPlayUrl(playUrlRef.current);
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
      const playable =
        playingRow.durationSec > 0
          ? await fixCaptureBlobDuration(
              typedBlob,
              playingRow.durationSec,
              mimeType,
            )
          : typedBlob;
      const objectUrl = URL.createObjectURL(playable);
      playUrlRef.current = objectUrl;
      loadedPlayRef.current = { id: playingId, size: blob.size };
      setPlayUrl(objectUrl);
      setPlayLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [onToast, playingRow?.id]);

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
    loadedPlayRef.current = null;
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

  const handleCopyLink = async (row: ScreenCaptureRecord) => {
    if (!requireDownloadAccess() || linkingId) return;
    const blob = await getScreenCaptureBlob(row.id);
    if (!blob) {
      onToast?.("Capture file missing.");
      return;
    }
    setLinkingId(row.id);
    try {
      const { url } = await createScreenCaptureShareLink(row, blob);
      try {
        await navigator.clipboard.writeText(url);
        onToast?.("Private recording link copied — it expires in 7 days.");
      } catch {
        window.prompt("Copy this private recording link:", url);
      }
    } catch (error) {
      onToast?.(
        error instanceof Error ? error.message : "Could not create a recording link.",
      );
    } finally {
      setLinkingId(null);
    }
  };

  const handleDelete = async (row: ScreenCaptureRecord) => {
    await deleteScreenCapture(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setOpenMenuId(null);
    onToast?.("Capture removed from this device.");
  };

  const beginRename = (row: ScreenCaptureRecord) => {
    setRenamingId(row.id);
    setRenameDraft(row.filename.replace(/\.(webm|mp4)$/i, ""));
    setOpenMenuId(null);
  };

  const submitRename = (row: ScreenCaptureRecord) => {
    const renamed = renameScreenCapture(row.id, renameDraft);
    if (!renamed) {
      onToast?.("Enter a valid recording name.");
      return;
    }
    setRows((prev) =>
      prev.map((item) => (item.id === renamed.id ? renamed : item)),
    );
    setRenamingId(null);
    setRenameDraft("");
    onToast?.("Recording renamed.");
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
            {renamingId === row.id ? (
              <form
                className="flex min-w-0 flex-1 items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitRename(row);
                }}
              >
                <label className="sr-only" htmlFor={`capture-name-${row.id}`}>
                  Recording name
                </label>
                <input
                  id={`capture-name-${row.id}`}
                  autoFocus
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  maxLength={120}
                  className="min-w-0 flex-1 rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/30"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingId(null)}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </form>
            ) : (
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
            )}
            <div className="relative flex shrink-0 items-center gap-1" data-capture-menu>
              <button
                type="button"
                title="Watch"
                onClick={() => handlePlay(row)}
                className="rounded-lg border border-teal-200 px-2 py-1 text-[10px] font-bold text-teal-800 hover:bg-teal-50"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`More actions for ${row.filename}`}
                aria-haspopup="menu"
                aria-expanded={openMenuId === row.id}
                onClick={() =>
                  setOpenMenuId((current) => (current === row.id ? null : row.id))
                }
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {openMenuId === row.id ? (
                <div
                  role="menu"
                  aria-label={`Actions for ${row.filename}`}
                  className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => beginRename(row)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenuId(null);
                      void handleDownload(row, "webm");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download WebM
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={mp4Exporting}
                    onClick={() => {
                      setOpenMenuId(null);
                      void handleDownload(row, "mp4");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {mp4Exporting ? "Preparing MP4…" : "Download MP4"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenuId(null);
                      void handleDownload(row, "native");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download original
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={linkingId === row.id}
                    onClick={() => {
                      setOpenMenuId(null);
                      void handleCopyLink(row);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {linkingId === row.id ? "Creating link…" : "Copy client link"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenuId(null);
                      void handleShare(row);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share to apps
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleDelete(row)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              ) : null}
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
                    key={playingRow.id}
                    controls
                    playsInline
                    autoPlay
                    preload="auto"
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
