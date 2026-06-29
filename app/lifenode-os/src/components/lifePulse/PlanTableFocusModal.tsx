"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function PlanTableFocusModal({
  open,
  title,
  onClose,
  children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-900/55 p-4 pt-[max(4rem,80px)] backdrop-blur-md"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex min-h-0 w-full max-w-6xl flex-1 flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="relative flex max-h-[min(92dvh,calc(100dvh-5rem))] min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/98 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 px-5 py-4">
            <h3 className="min-w-0 text-sm font-bold uppercase tracking-widest text-slate-800">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
              aria-label="Minimize table"
              title="Minimize"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(overlay, document.body);
  }
  return overlay;
}
