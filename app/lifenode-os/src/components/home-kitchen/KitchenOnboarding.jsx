"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  Loader2,
  Refrigerator,
  Snowflake,
  Sparkles,
  Wand2,
} from "lucide-react";
import { STORAGE_TYPES } from "./data";
import KitchenCameraCapture from "./KitchenCameraCapture";
import { detectItemsFromScanPhotos } from "@/src/lib/kitchenScan";
import { KITCHEN_GLASS_PANEL, KITCHEN_TEXT } from "@/src/lib/homeNode/kitchenMintCream";

const STEPS = [
  { id: 1, label: "Storage" },
  { id: 2, label: "Photos" },
  { id: 3, label: "Detection" },
  { id: 4, label: "Confirm" },
];

const STORAGE_ICONS = {
  refrigerator: Refrigerator,
  freezer: Snowflake,
  pantry: Wand2,
  cabinets: Sparkles,
};

export default function KitchenOnboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [storage, setStorage] = useState({
    refrigerator: true,
    freezer: false,
    pantry: false,
    cabinets: false,
  });
  const [photos, setPhotos] = useState({ outside: null, inside: null });
  const [photoPreviews, setPhotoPreviews] = useState({ outside: null, inside: null });
  const previewUrlsRef = useRef({ outside: null, inside: null });
  const [activePhotoSlot, setActivePhotoSlot] = useState(null);
  const [detected, setDetected] = useState([]);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState(null);

  const enabledStorage = Object.entries(storage)
    .filter(([, v]) => v)
    .map(([k]) => k);

  function toggleStorage(id) {
    setStorage((s) => ({ ...s, [id]: !s[id] }));
  }

  const photoTaken = {
    outside: Boolean(photos.outside),
    inside: Boolean(photos.inside),
  };

  const handlePhotoCapture = useCallback((file) => {
    if (!activePhotoSlot) return;
    const slot = activePhotoSlot;
    setPhotos((prev) => ({ ...prev, [slot]: file }));
    const url = URL.createObjectURL(file);
    if (previewUrlsRef.current[slot]) URL.revokeObjectURL(previewUrlsRef.current[slot]);
    previewUrlsRef.current = { ...previewUrlsRef.current, [slot]: url };
    setPhotoPreviews((prev) => ({ ...prev, [slot]: url }));
    setActivePhotoSlot(null);
  }, [activePhotoSlot]);

  async function advanceFromPhotos() {
    setScanBusy(true);
    setScanError(null);
    try {
      const primaryStorage = enabledStorage[0] || "refrigerator";
      const items = await detectItemsFromScanPhotos(photos, primaryStorage);
      setDetected(items);
      setStep(3);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Could not detect items from photos.");
    } finally {
      setScanBusy(false);
    }
  }

  function toggleDetected(id) {
    setDetected((items) => items.map((i) => (i.id === id ? { ...i, kept: !i.kept } : i)));
  }

  function finish() {
    const finalItems = detected.filter((d) => d.kept !== false);
    onComplete({ enabledStorage, items: finalItems });
  }

  const canContinue =
    (step === 1 && enabledStorage.length > 0) ||
    (step === 2 && photoTaken.outside && photoTaken.inside) ||
    step === 3 ||
    step === 4;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress rail */}
      <ol className="mb-10 flex items-center justify-between gap-2" aria-label="Onboarding progress">
        {STEPS.map((s, idx) => {
          const reached = step >= s.id;
          const active = step === s.id;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                  active
                    ? "bg-[#84A59D] text-white"
                    : reached
                      ? "bg-[#84A59D]/20 text-[#3F5E58]"
                      : "bg-white text-slate-400 ring-1 ring-slate-200"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {reached && !active ? <Check size={14} /> : s.id}
              </div>
              <span className={`text-xs font-medium ${active ? "text-slate-900" : "text-slate-400"}`}>
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <span
                  className={`h-px flex-1 transition-colors duration-300 ${
                    step > s.id ? "bg-[#84A59D]" : "bg-slate-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <section className={`${KITCHEN_GLASS_PANEL} p-6 md:p-10`}>
        {step === 1 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#84A59D]">Step 1</p>
            <h2 className={`mb-2 text-2xl font-semibold md:text-3xl ${KITCHEN_TEXT.title}`}>
              Where do you store food?
            </h2>
            <p className="mb-8 max-w-xl text-sm leading-relaxed text-slate-500 md:text-base">
              Pick the spaces your kitchen has. We'll set up a calm, organized view of each one.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {STORAGE_TYPES.map((s) => {
                const Icon = STORAGE_ICONS[s.id] || Refrigerator;
                const on = storage[s.id];
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStorage(s.id)}
                    aria-pressed={on}
                    className={`group flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                      on
                        ? "border-[#84A59D] bg-[#84A59D]/8 shadow-[0_12px_28px_rgba(132,165,157,0.18)]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: on ? `${s.accent}1F` : "#F4F4F5",
                        color: s.accent,
                      }}
                    >
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-base font-semibold text-slate-900">{s.label}</span>
                      <span className="block text-sm text-slate-500">{s.blurb}</span>
                    </span>
                    <span
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                        on ? "bg-[#84A59D] text-white" : "ring-1 ring-slate-300"
                      }`}
                      aria-hidden
                    >
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#84A59D]">Step 2</p>
            <h2 className={`mb-2 text-2xl font-semibold md:text-3xl ${KITCHEN_TEXT.title}`}>Take two photos.</h2>
            <p className="mb-8 max-w-xl text-sm leading-relaxed text-slate-500 md:text-base">
              One of the front, one of the inside. Our AI uses both to map shelves and items.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { id: "outside", label: "Front view", hint: "Closed door" },
                { id: "inside", label: "Inside view", hint: "Open, lights on" },
              ].map((p) => (
                <PhotoTile
                  key={p.id}
                  taken={photoTaken[p.id]}
                  previewUrl={photoPreviews[p.id]}
                  label={p.label}
                  hint={p.hint}
                  onCapture={() => setActivePhotoSlot(p.id)}
                />
              ))}
            </div>
            {scanError ? <p className="mt-4 text-sm text-red-700">{scanError}</p> : null}
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#84A59D]">Step 3</p>
            <h2 className={`mb-2 text-2xl font-semibold md:text-3xl ${KITCHEN_TEXT.title}`}>
              {detected.length
                ? `We found ${detected.length} items.`
                : "No items detected yet."}
            </h2>
            <p className="mb-6 max-w-xl text-sm leading-relaxed text-slate-500 md:text-base">
              {detected.length
                ? "Toggle anything that's wrong — you can refine quantities and shelves on the dashboard."
                : "Your pantry starts empty. Add items from the dashboard after setup, or continue with a blank kitchen."}
            </p>
            {detected.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
                Scan or add groceries later — nothing is pre-filled for new accounts.
              </p>
            ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {detected.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleDetected(item.id)}
                    aria-pressed={item.kept}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                      item.kept
                        ? "border-[#84A59D] bg-white"
                        : "border-slate-200 bg-slate-50 opacity-60"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{item.name}</span>
                      <span className="block text-xs text-slate-500">
                        {item.quantity} • {item.shelf}
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                        item.kept ? "bg-[#84A59D] text-white" : "bg-white ring-1 ring-slate-300 text-slate-400"
                      }`}
                      aria-hidden
                    >
                      {item.kept ? <Check size={14} strokeWidth={3} /> : "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#84A59D]">Step 4</p>
            <h2 className={`mb-2 text-2xl font-semibold md:text-3xl ${KITCHEN_TEXT.title}`}>All set.</h2>
            <p className="mb-8 max-w-xl text-sm leading-relaxed text-slate-500 md:text-base">
              Your kitchen is mapped. From here, HomeNode will quietly track what you have, what's
              expiring, and what to cook next.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryStat label="Storage spaces" value={enabledStorage.length} />
              <SummaryStat label="Items detected" value={detected.filter((d) => d.kept).length} />
              <SummaryStat label="Recipes ready" value={0} />
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:invisible"
          >
            <ChevronLeft size={16} /> Back
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 2) void advanceFromPhotos();
                else setStep((s) => s + 1);
              }}
              disabled={!canContinue || scanBusy}
              className="inline-flex items-center gap-2 rounded-full bg-[#3F5E58] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(63,94,88,0.25)] transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84A59D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {scanBusy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Detecting…
                </>
              ) : (
                <>
                  Continue <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="inline-flex items-center gap-2 rounded-full bg-[#3F5E58] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(63,94,88,0.25)] transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84A59D]"
            >
              Open my kitchen <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>

      <KitchenCameraCapture
        open={Boolean(activePhotoSlot)}
        title={activePhotoSlot === "outside" ? "Front view" : "Inside view"}
        hint="Flip between front and back camera if needed."
        onClose={() => setActivePhotoSlot(null)}
        onCapture={handlePhotoCapture}
      />
    </div>
  );
}

function PhotoTile({ taken, previewUrl, label, hint, onCapture }) {
  return (
    <button
      type="button"
      onClick={onCapture}
      className={`relative flex aspect-[4/3] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
        taken
          ? "border-[#84A59D] bg-gradient-to-br from-[#84A59D]/15 to-[#84A59D]/5"
          : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white"
      }`}
      aria-pressed={taken}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={label} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <span
        className={`relative z-[1] flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
          taken ? "bg-[#84A59D] text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"
        }`}
      >
        {taken ? <Check size={26} strokeWidth={2} /> : <Camera size={24} strokeWidth={1.75} />}
      </span>
      <span className="relative z-[1] text-base font-semibold text-slate-900">{label}</span>
      <span className="relative z-[1] text-xs text-slate-500">{taken ? "Retake" : hint}</span>
    </button>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
