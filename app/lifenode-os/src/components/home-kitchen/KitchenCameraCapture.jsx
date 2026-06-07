"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, SwitchCamera, X } from "lucide-react";

/**
 * Full-screen camera capture with front/back flip.
 * Returns a JPEG File via onCapture.
 */
export default function KitchenCameraCapture({
  open,
  title = "Take a photo",
  hint = "Align the storage area in frame, then capture.",
  onClose,
  onCapture,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startStream = useCallback(async () => {
    setBusy(true);
    setError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      const el = videoRef.current;
      if (el) {
        el.srcObject = stream;
        await el.play();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Camera permission denied or unavailable on this device.",
      );
    } finally {
      setBusy(false);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }
    void startStream();
    return () => stopStream();
  }, [open, startStream, stopStream]);

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `kitchen-scan-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.88,
    );
  }, [onCapture, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/40 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/50 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-[#1E293B]">{title}</p>
            <p className="text-xs text-[#475569]">{hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#475569] transition hover:bg-white"
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="aspect-[4/3] max-h-[50vh] w-full object-cover"
            playsInline
            muted
          />
          <button
            type="button"
            onClick={flipCamera}
            disabled={busy}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-50"
            aria-label="Flip camera"
          >
            <SwitchCamera size={14} />
            Flip
          </button>
        </div>

        {error ? (
          <p className="px-5 pt-3 text-sm text-red-700">{error}</p>
        ) : (
          <p className="px-5 pt-3 text-xs text-[#475569]">
            {busy ? "Starting camera…" : "Use Flip for front or back camera."}
          </p>
        )}

        <div className="flex gap-2 px-5 py-4">
          <button
            type="button"
            onClick={capture}
            disabled={busy || Boolean(error)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#3F5E58] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#325048] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Camera size={16} />
            Capture
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
