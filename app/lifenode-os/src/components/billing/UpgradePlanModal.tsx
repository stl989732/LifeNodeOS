"use client";

import Link from "next/link";
import type { PlanKey, BillingInterval, PaidPlanKey } from "@/src/lib/billing/plans";
import { startPlanCheckout } from "@/src/lib/billing/startPlanCheckout";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  plan: PlanKey;
};

export default function UpgradePlanModal({
  open,
  onClose,
  title,
  message,
  plan,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        aria-label="Close upgrade dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[301] w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-teal-700">
          {plan === "core" ? "Core plan" : "Plan limit"}
        </p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={onClose}
          >
            View plans
          </Link>
          {plan === "core" ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                onClose();
                void startPlanCheckout("sync");
              }}
            >
              Get Sync
            </button>
          ) : plan === "sync" ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                onClose();
                void startPlanCheckout("nexus");
              }}
            >
              Get Nexus
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            onClick={onClose}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
