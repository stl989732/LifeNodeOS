"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useLifeNode } from "@/src/context/LifeNodeContext";

/** Hide on marketing landing + shell picker; show on node dashboards and `/dashboard`. */
const HIDDEN_PATHS = ["/", "/shell"];

/**
 * Add a warm "Linos here!" opener to bridge messages so the alert feels like
 * it's coming from the assistant directly. We avoid double-prefixing if the
 * source copy already starts with "Linos" (old "Lino here." also gets
 * normalized to the new voice).
 */
function personalize(message) {
  if (!message) return message;
  const trimmed = message.trim();
  if (/^lino[s]?\s*(here|speaking)[!.,]?/i.test(trimmed)) {
    return trimmed.replace(
      /^lino[s]?\s*(here|speaking)[!.,]?\s*/i,
      "Linos here! "
    );
  }
  return `Linos here! ${trimmed}`;
}

export default function LinoAlert() {
  const pathname = usePathname();
  const {
    activeLogicBridgeAlerts,
    linoMessage,
    executeBridgePrimaryAction,
    dismissLogicBridgeAlert,
    dismissLino,
    switchNode,
  } = useLifeNode();

  if (HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/auth"))
    return null;

  const primary = activeLogicBridgeAlerts[0];
  if (!primary && !linoMessage) return null;

  const rawMessage = primary?.message ?? linoMessage?.text;
  const message = personalize(rawMessage);
  const triggerSource = primary?.triggerSource ?? "Linos Assistant";

  return (
    <div className="pointer-events-none fixed bottom-6 left-4 z-[88] w-[min(420px,calc(100vw-2rem))] md:bottom-8 md:left-6">
      <div className="pointer-events-auto rounded-2xl border border-white/15 bg-[#0f172a]/92 px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#1E293B] text-cyan-200">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Linos Alert
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              {triggerSource}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-50">
              {message}
            </p>
            {primary?.condition && (
              <p className="mt-1 text-[11px] text-slate-400">
                {primary.condition}
              </p>
            )}
            {(primary || linoMessage) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {primary ? (
                  <button
                    type="button"
                    onClick={() => executeBridgePrimaryAction(primary)}
                    className="rounded-xl bg-[#1E293B] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#24364d]"
                  >
                    {primary.primaryActionLabel}
                  </button>
                ) : (
                  linoMessage?.targetNode && (
                    <button
                      type="button"
                      onClick={() => switchNode(linoMessage.targetNode)}
                      className="rounded-xl bg-[#1E293B] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#24364d]"
                    >
                      {linoMessage.actionLabel}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() =>
                    primary
                      ? dismissLogicBridgeAlert(primary.bridgeId)
                      : dismissLino()
                  }
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 backdrop-blur-sm transition hover:bg-white/10"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
