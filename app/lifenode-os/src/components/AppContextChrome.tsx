"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Timer } from "lucide-react";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import AppMobileSupportDrawer from "@/src/components/AppMobileSupportDrawer";
import SupportChromeMenu from "@/src/components/SupportChromeMenu";
import { LIFENODE_CHROME_BACK } from "@/src/components/NodeNavChrome";

type Props = {
  variant?: "light" | "dark";
  showTimer?: boolean;
  /** Nudge right to clear collapsed hat rail on node routes (desktop only). */
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

  const barBg = lightChrome
    ? "border-b border-slate-200/90 bg-[#F8F8FF]/98"
    : "border-b border-white/10 bg-[#0f172a]/96";

  const pillCompact =
    "inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition sm:min-h-[38px] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px] sm:tracking-[0.16em] md:px-3";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[108] shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-md ${barBg} pt-[env(safe-area-inset-top,0px)]`}
      style={{
        height: "calc(var(--ln-node-nav-chrome-block) + env(safe-area-inset-top, 0px))",
      }}
      aria-label="LifeNode navigation"
    >
      <div
        className={`flex h-[var(--ln-node-nav-chrome-block)] items-center justify-between gap-2 px-2 sm:px-3 md:px-4 ${
          offsetForRail ? "md:pl-[calc(60px+0.75rem)]" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              const ev = new CustomEvent(LIFENODE_CHROME_BACK, {
                cancelable: true,
              });
              window.dispatchEvent(ev);
              if (!ev.defaultPrevented) router.back();
            }}
            aria-label="Go back to previous page"
            className={`${pillCompact} ${pillBase}`}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!openHatGallery()) router.push("/shell");
            }}
            aria-label="Open LifeNode Dashboard"
            className={`${pillCompact} max-w-[9.5rem] truncate sm:max-w-none ${pillMuted}`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate sm:hidden">Dashboard</span>
            <span className="hidden truncate sm:inline">LifeNode Dashboard</span>
          </button>
          {showTimer ? (
            <span
              className={`inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border px-2 py-1 font-mono text-[9px] font-semibold tabular-nums uppercase tracking-wide sm:min-h-[38px] sm:gap-1.5 sm:px-2.5 sm:text-[10px] ${
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
        <div className="flex shrink-0 items-center gap-1.5">
          <AppMobileSupportDrawer variant={variant} />
          <SupportChromeMenu variant={variant} className="hidden md:inline-flex shrink-0" />
        </div>
      </div>
    </header>
  );
}
