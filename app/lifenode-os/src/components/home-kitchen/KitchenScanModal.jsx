"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Loader2, Refrigerator, Snowflake, Sparkles, Wand2, X } from "lucide-react";
import KitchenCameraCapture from "./KitchenCameraCapture";
import { STORAGE_TYPES } from "./data";
import { detectItemsFromScanPhotos } from "@/src/lib/kitchenScan";
import { KITCHEN_GLASS_PANEL, KITCHEN_TEXT } from "@/src/lib/homeNode/kitchenMintCream";

const STORAGE_ICONS = {
  refrigerator: Refrigerator,
  freezer: Snowflake,
  pantry: Wand2,
  cabinets: Sparkles,
};

const PHOTO_SLOTS = [
  { id: "outside", label: "Front view", hint: "Closed door" },
  { id: "inside", label: "Inside view", hint: "Open, lights on" },
];

export default function KitchenScanModal({
  open,
  onClose,
  enabledStorage,
  onComplete,
}) {
  const [storageId, setStorageId] = useState(null);
  const [photos, setPhotos] = useState({ outside: null, inside: null });
  const [previews, setPreviews] = useState({ outside: null, inside: null });
  const previewUrlsRef = useRef({ outside: null, inside: null });
  const [activeSlot, setActiveSlot] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const storageOptions = useMemo(
    () => STORAGE_TYPES.filter((s) => !enabledStorage?.length || enabledStorage.includes(s.id)),
    [enabledStorage],
  );

  const revokePreviews = useCallback(() => {
    for (const url of Object.values(previewUrlsRef.current)) {
      if (url) URL.revokeObjectURL(url);
    }
    previewUrlsRef.current = { outside: null, inside: null };
    setPreviews({ outside: null, inside: null });
  }, []);

  const reset = useCallback(() => {
    setStorageId(null);
    setPhotos({ outside: null, inside: null });
    revokePreviews();
    setActiveSlot(null);
    setAnalyzing(false);
    setError(null);
  }, [revokePreviews]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleCapture = useCallback(
    (file) => {
      if (!activeSlot) return;
      setPhotos((prev) => ({ ...prev, [activeSlot]: file }));
      const url = URL.createObjectURL(file);
      if (previewUrlsRef.current[activeSlot]) {
        URL.revokeObjectURL(previewUrlsRef.current[activeSlot]);
      }
      previewUrlsRef.current = { ...previewUrlsRef.current, [activeSlot]: url };
      setPreviews((prev) => ({ ...prev, [activeSlot]: url }));
      setActiveSlot(null);
    },
    [activeSlot],
  );

  const readyToAnalyze = Boolean(storageId && photos.outside && photos.inside);

  async function runAnalysis() {
    if (!storageId || !readyToAnalyze) return;
    setAnalyzing(true);
    setError(null);
    try {
      const items = await detectItemsFromScanPhotos(photos, storageId);
      onComplete({ storageId, items });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed. Try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (!open) return null;

  const activeStorage = STORAGE_TYPES.find((s) => s.id === storageId);

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center sm:p-6">
        <button
          type="button"
          aria-label="Close scan"
          className="absolute inset-0 bg-slate-900/45 backdrop-blur-md"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal
          aria-labelledby="kitchen-scan-title"
          className={`relative z-[111] flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden ${KITCHEN_GLASS_PANEL}`}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/50 px-5 py-4">
            <div>
              <h2 id="kitchen-scan-title" className={`text-lg font-semibold ${KITCHEN_TEXT.title}`}>
                Scan storage
              </h2>
              <p className="text-xs text-[#475569]">
                Fridge, freezer, pantry, or cabinet — two photos, then AI detection.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[#475569] transition hover:bg-white/80"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {!storageId ? (
              <div>
                <p className="mb-3 text-sm font-medium text-[#475569]">What are you scanning?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {storageOptions.map((s) => {
                    const Icon = STORAGE_ICONS[s.id] || Refrigerator;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStorageId(s.id)}
                        className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-[#84A59D]"
                      >
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${s.accent}1A`, color: s.accent }}
                        >
                          <Icon size={20} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">{s.label}</span>
                          <span className="block text-xs text-slate-500">{s.blurb}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#475569]">
                    Scanning: <span className="font-semibold text-[#1E293B]">{activeStorage?.label}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setStorageId(null)}
                    className="text-xs font-semibold text-[#84A59D] underline"
                  >
                    Change
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PHOTO_SLOTS.map((slot) => {
                    const taken = Boolean(photos[slot.id]);
                    const preview = previews[slot.id];
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setActiveSlot(slot.id)}
                        className={`relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition ${
                          taken
                            ? "border-[#84A59D] bg-[#84A59D]/10"
                            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white"
                        }`}
                      >
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview}
                            alt={slot.label}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : null}
                        <span
                          className={`relative z-[1] flex h-12 w-12 items-center justify-center rounded-full ${
                            taken ? "bg-[#84A59D] text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"
                          }`}
                        >
                          {taken ? <Check size={22} /> : <Camera size={22} />}
                        </span>
                        <span className="relative z-[1] text-sm font-semibold text-slate-900">{slot.label}</span>
                        <span className="relative z-[1] text-xs text-slate-500">
                          {taken ? "Retake" : slot.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {error ? <p className="text-sm text-red-700">{error}</p> : null}
              </>
            )}
          </div>

          {storageId ? (
            <div className="shrink-0 border-t border-white/50 px-5 py-4">
              <button
                type="button"
                onClick={runAnalysis}
                disabled={!readyToAnalyze || analyzing}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#3F5E58] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#325048] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {analyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Detecting items…
                  </>
                ) : (
                  "Detect items"
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <KitchenCameraCapture
        open={Boolean(activeSlot)}
        title={
          activeSlot === "outside"
            ? "Front view"
            : activeSlot === "inside"
              ? "Inside view"
              : "Take a photo"
        }
        hint="Flip between front and back camera if needed."
        onClose={() => setActiveSlot(null)}
        onCapture={handleCapture}
      />
    </>
  );
}
