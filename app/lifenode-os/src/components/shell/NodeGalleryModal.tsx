"use client";

import { useCallback, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import type { ActiveNodeName } from "@/lib/node-mappings";
import type { ActiveNode } from "@/src/context/LifeNodeContext";
import { activeNodeAllowed } from "@/src/lib/billing/planLimits";
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";
import { NODE_GALLERY_ENTRIES } from "./node-gallery-nodes";

type Props = {
  open: boolean;
  onClose: () => void;
  activeHats: ActiveNode[];
  onToggleHat: (node: ActiveNode) => void;
};

function nodeUpgradeLabel(node: ActiveNodeName): string {
  if (node === "TraderNode" || node === "ProNode") return "Nexus";
  if (node === "VitalNode") return "Sync";
  return "paid plan";
}

export default function NodeGalleryModal({
  open,
  onClose,
  activeHats,
  onToggleHat,
}: Props) {
  const titleId = useId();
  const router = useRouter();
  const { entitlements } = usePlanEntitlements();

  const handleToggle = useCallback(
    (node: ActiveNode, selected: boolean) => {
      if (!selected && !activeNodeAllowed(entitlements, node)) {
        onClose();
        router.push("/pricing");
        return;
      }
      onToggleHat(node);
    },
    [entitlements, onClose, onToggleHat, router],
  );
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[rgba(0,0,0,0.6)] backdrop-blur-[20px]"
        aria-label="Close node gallery"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[201] w-full max-w-3xl overflow-hidden rounded-3xl border border-solid border-white/10 bg-[rgba(12,16,24,0.72)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-[20px] md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes ln-node-gallery-in {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-teal-300/90">
              Node gallery
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-bold text-white md:text-2xl">
              Orchestrate your hats
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Toggle Nodes on to pin them in the left sidebar and Linos Assistant.
              Click any node in the rail to open its feature menu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {activeHats.length === 0 ? (
          <p className="mb-6 rounded-2xl border border-dashed border-teal-400/35 bg-teal-500/10 px-4 py-6 text-center text-sm text-teal-100/90">
            Choose your first Node to begin orchestrating — or{" "}
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/pricing");
              }}
              className="font-semibold text-teal-200 underline underline-offset-2 transition hover:text-white"
            >
              view Sync &amp; Nexus plans
            </button>{" "}
            first.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
          {NODE_GALLERY_ENTRIES.map(({ node, label, Icon }, index) => {
            const selected = activeHats.includes(node);
            const allowed = activeNodeAllowed(entitlements, node);
            return (
              <button
                key={node}
                type="button"
                onClick={() => handleToggle(node, selected)}
                style={{
                  animation: `ln-node-gallery-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${index * 55}ms both`,
                }}
                className={`ln-hat-card group relative flex flex-col items-center gap-3 rounded-2xl border border-solid px-4 py-6 text-center transition duration-300 ease-out ${
                  selected
                    ? "border-teal-400/55 bg-[rgba(45,212,191,0.12)] shadow-[0_0_28px_rgba(45,212,191,0.22)]"
                    : allowed
                      ? "border-white/10 bg-[rgba(255,255,255,0.05)] opacity-80 hover:scale-[1.05] hover:border-[rgba(0,255,200,0.45)] hover:bg-[rgba(255,255,255,0.1)] hover:opacity-100 hover:shadow-[0_0_22px_rgba(0,255,200,0.18)]"
                      : "border-white/10 bg-[rgba(255,255,255,0.03)] opacity-60"
                } backdrop-blur-[10px]`}
              >
                {!allowed && !selected ? (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/90 text-slate-200">
                    <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                ) : null}
                {selected ? (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-black shadow-[0_0_12px_rgba(45,212,191,0.6)]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : null}
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 transition duration-300 group-hover:shadow-[0_0_18px_rgba(45,212,191,0.25)] ${
                    selected ? "text-teal-200" : "text-slate-200"
                  }`}
                >
                  <Icon className="h-7 w-7" strokeWidth={1.5} />
                </span>
                <span className="text-sm font-bold text-white">{label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {selected
                    ? "Selected"
                    : allowed
                      ? "Tap to toggle"
                      : nodeUpgradeLabel(node)}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Press Esc or click outside to close.
        </p>
      </div>
    </div>
  );
}
