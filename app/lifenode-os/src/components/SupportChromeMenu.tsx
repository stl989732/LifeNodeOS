"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LifeBuoy, MessageSquare } from "lucide-react";
import { SUPPORT_ROUTES } from "@/lib/support/routes";

type ChromeVariant = "light" | "dark";

type Props = {
  variant?: ChromeVariant;
  className?: string;
};

export default function SupportChromeMenu({
  variant = "dark",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerClass =
    variant === "light"
      ? "border-white/60 bg-white/55 text-[#1E293B] shadow-[0_8px_24px_rgba(110,140,100,0.15)] hover:bg-white/75"
      : "border-white/15 bg-slate-900/70 text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-slate-900/85";

  const panelClass =
    variant === "light"
      ? "border-slate-200/90 bg-white/95 text-slate-800"
      : "border-white/15 bg-slate-900/95 text-slate-100";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-2xl transition ${triggerClass}`}
      >
        <LifeBuoy className="h-3.5 w-3.5" />
        Support
        <ChevronDown
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute right-0 z-[120] mt-2 w-56 overflow-hidden rounded-2xl border p-1 shadow-[0_16px_48px_rgba(15,23,42,0.25)] backdrop-blur-xl ${panelClass}`}
        >
          <Link
            href={SUPPORT_ROUTES.feedback}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
            <span>
              <span className="block text-sm font-semibold">Feedback & suggestions</span>
              <span className="mt-0.5 block text-[11px] opacity-70">
                Share ideas to improve LifeNodeOS
              </span>
            </span>
          </Link>
          <Link
            href={SUPPORT_ROUTES.ticket}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-0.5 flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
            <span>
              <span className="block text-sm font-semibold">Ticket escalation</span>
              <span className="mt-0.5 block text-[11px] opacity-70">
                Report bugs, billing, or account issues
              </span>
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
