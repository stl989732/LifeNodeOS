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
    ? "border-white/60 bg-white/55 text-[#1E293B] shadow-[0_8px_24px_rgba(110,140,100,0.15)] hover:bg-white/75"
    : "border-white/15 bg-slate-900/70 text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-slate-900/85";

  const pillMuted = lightChrome
    ? "border-white/60 bg-white/45 text-[#1E293B] shadow-[0_8px_24px_rgba(110,140,100,0.12)] hover:bg-white/60"
    : "border-white/15 bg-white/[0.06] text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-white/[0.12]";

  const leftClass = offsetForRail
    ? "left-[calc(60px+10px)] md:left-[calc(60px+14px)]"
    : "left-3 md:left-4";

  return (
    <div
      className={`pointer-events-none fixed ${leftClass} right-3 top-3 z-[110] flex items-center justify-between gap-2 md:top-4`}
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
          className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-2xl transition ${pillBase}`}
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
          className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-2xl transition ${pillMuted}`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          LifeNode Dashboard
        </button>
        {showTimer ? (
          <span
            className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[10px] font-semibold tabular-nums uppercase tracking-wide backdrop-blur-xl ${
              lightChrome
                ? "border-white/60 bg-white/50 text-[#475569]"
                : "border-white/10 bg-slate-950/50 text-slate-300"
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
  );
}
