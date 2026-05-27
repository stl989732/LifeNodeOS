"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Timer } from "lucide-react";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";

/** SPA-friendly Back: listeners may call `preventDefault()` to handle in-app state first. */
export const LIFENODE_CHROME_BACK = "lifenode:chrome-back";

function formatSessionClock(d: Date) {
  return d.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Floating top-left chrome that appears on every Node page. Provides:
 *   - `Back` — dispatches `lifenode:chrome-back` (cancelable); if not handled, `router.back()`.
 *   - `LifeNode Dashboard` — opens the hat gallery when rails are mounted; else `/shell`.
 *
 * Gated node pages (`OnboardingGate`) add top padding using
 * `--ln-node-nav-chrome-block` so this bar does not cover hero “hat” titles.
 * Horizontally nudged right on node routes so it clears the collapsed hat rail
 * (`DualRailCommandCenter`).
 *
 * Mounted globally from `app/layout.tsx`; the component itself decides
 * whether to render based on the current pathname, so adding a new Node
 * route just means adding it to `NODE_ROUTE_PREFIXES`.
 */
const NODE_ROUTE_PREFIXES = [
  "/work",
  "/home",
  "/pulse",
  "/vital",
  "/pro",
  "/trader",
  "/vanode",
];

export default function NodeNavChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const { openHatGallery, theme } = useLifeNodeContext();
  const lightChrome = theme === "mint-cream" || theme === "grainy-dawn";
  const [sessionClock, setSessionClock] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setSessionClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!pathname) return null;

  const onNodeRoute = NODE_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!onNodeRoute) return null;

  return (
    <div className="pointer-events-none fixed left-[calc(60px+10px)] top-3 z-[110] flex flex-wrap items-center gap-2 md:left-[calc(60px+14px)] md:top-4">
      <button
        type="button"
        onClick={() => {
          const ev = new CustomEvent(LIFENODE_CHROME_BACK, { cancelable: true });
          window.dispatchEvent(ev);
          if (!ev.defaultPrevented) {
            router.back();
          }
        }}
        aria-label="Go back to previous page"
        className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-2xl transition ${
          lightChrome
            ? "border-white/60 bg-white/55 text-[#1E293B] shadow-[0_8px_24px_rgba(110,140,100,0.15)] hover:bg-white/75"
            : "border-white/15 bg-slate-900/70 text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-slate-900/85"
        }`}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
      <button
        type="button"
        onClick={() => {
          if (!openHatGallery()) {
            router.push("/shell");
          }
        }}
        aria-label="Open LifeNode Dashboard"
        className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-2xl transition ${
          lightChrome
            ? "border-white/60 bg-white/45 text-[#1E293B] shadow-[0_8px_24px_rgba(110,140,100,0.12)] hover:bg-white/60"
            : "border-white/15 bg-white/[0.06] text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-white/[0.12]"
        }`}
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        LifeNode Dashboard
      </button>
      <span
        className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[10px] font-semibold tabular-nums uppercase tracking-wide backdrop-blur-xl ${
          lightChrome
            ? "border-white/60 bg-white/50 text-[#475569] shadow-[0_8px_24px_rgba(110,140,100,0.12)]"
            : "border-white/10 bg-slate-950/50 text-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        }`}
        title="Session clock (local)"
        suppressHydrationWarning
      >
        <Timer className="h-3 w-3 shrink-0 text-[#00ffc8]" aria-hidden />
        {formatSessionClock(sessionClock)}
      </span>
    </div>
  );
}
