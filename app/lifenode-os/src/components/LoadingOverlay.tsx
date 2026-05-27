"use client";

import { Loader2 } from "lucide-react";

export default function LoadingOverlay({
  open,
  message,
}: {
  open: boolean;
  message?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/45 p-6 backdrop-blur-md"
      role="alertdialog"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="max-w-sm rounded-3xl border border-white/35 bg-white/25 px-10 py-10 shadow-2xl backdrop-blur-xl">
        <Loader2 className="mx-auto h-11 w-11 animate-spin text-teal-600" strokeWidth={2} />
        {message ? (
          <p className="mt-5 text-center text-sm font-semibold tracking-tight text-slate-900">
            {message}
          </p>
        ) : (
          <p className="mt-5 text-center text-sm font-semibold tracking-tight text-slate-900">
            Loading…
          </p>
        )}
        <p className="mt-2 text-center text-xs text-slate-600">
          Waiting for recipe and image from the kitchen model.
        </p>
      </div>
    </div>
  );
}
