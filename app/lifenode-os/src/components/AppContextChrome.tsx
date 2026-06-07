"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Timer } from "lucide-react";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import SupportChromeMenu from "@/src/components/SupportChromeMenu";
import { LIFENODE_CHROME_BACK } from "@/src/components/NodeNavChrome";

type Props = {
  variant?: "light" | "dark";
  showTimer?: boolean;
  /** Nudge right to clear collapsed hat rail on node routes. */
  offsetForRail?: boolean;
};

function formatSessionClock(d: Date) {
  return d.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AppContextChrome({
  variant = "dark",
  showTimer = false,
  offsetForRail = false,
}: Props) {
  const router = useRouter();
  const { openHatGallery } = useLifeNodeContext();
  const lightChrome = variant === "light";
  const [sessionClock, setSessionClock] = useState(() => new Date());

  useEffect(() => {
    if (!showTimer) return;
    const id = window.setInterval(() => setSessionClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [showTimer]);

  const pillBase = lightChrome
    ? "border-slate-200/90 bg-white text-[#1E293B] shadow-sm hover:bg-slate-50"
    : "border-white/15 bg-slate-900/90 text-slate-100 shadow-sm hover:bg-slate-900";

  const pillMuted = lightChrome
    ? "border-slate-200/90 bg-[#F8F8FF] text-[#1E293B] shadow-sm hover:bg-white"
    : "border-white/15 bg-slate-900/85 text-slate-200 shadow-sm hover:bg-slate-900";

  const leftClass = offsetForRail
    ? "left-[calc(60px+10px)] md:left-[calc(60px+14px)]"
    : "left-3 md:left-4";

  const barLeft = offsetForRail ? "left-[60px]" : "left-0";
  const barBg = lightChrome
    ? "border-b border-slate-200/90 bg-[#F8F8FF]/98"
    : "border-b border-white/10 bg-[#0f172a]/96";

  return (
    <>
      {/* Opaque strip — stays fixed and separate from scrolling dashboard */}
      <div
        className={`pointer-events-none fixed top-0 right-0 z-[108] h-[calc(3.75rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-md ${barLeft} ${barBg}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none fixed ${leftClass} right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[110] flex items-center justify-between gap-2 md:top-[calc(env(safe-area-inset-top,0px)+1rem)]`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const ev = new CustomEvent(LIFENODE_CHROME_BACK, { cancelable: true });
              window.dispatchEvent(ev);
              if (!ev.defaultPrevented) router.back();
            }}
            aria-label="Go back to previous page"
            className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${pillBase}`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (!openHatGallery()) router.push("/shell");
            }}
            aria-label="Open LifeNode Dashboard"
            className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${pillMuted}`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            LifeNode Dashboard
          </button>
          {showTimer ? (
            <span
              className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[10px] font-semibold tabular-nums uppercase tracking-wide ${
                lightChrome
                  ? "border-slate-200/90 bg-white text-[#475569]"
                  : "border-white/10 bg-slate-950/80 text-slate-300"
              }`}
              title="Session clock (local)"
              suppressHydrationWarning
            >
              <Timer className="h-3 w-3 shrink-0 text-[#00ffc8]" aria-hidden />
              {formatSessionClock(sessionClock)}
            </span>
          ) : null}
        </div>
        <SupportChromeMenu variant={variant} className="pointer-events-auto shrink-0" />
      </div>
    </>
  );
}
