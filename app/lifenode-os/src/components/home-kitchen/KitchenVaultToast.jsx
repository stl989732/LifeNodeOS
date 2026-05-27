"use client";

export default function KitchenVaultToast({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed bottom-6 left-1/2 z-[140] w-[min(420px,calc(100%-2rem))] -translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/60 bg-white/85 px-4 py-3.5 shadow-[0_16px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-emerald-900">{message}</p>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#475569] hover:bg-slate-100"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
