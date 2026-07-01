"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookOpen, Menu, X } from "lucide-react";
import {
  LANDING_DOC_LINKS,
  LANDING_SUPPORT_ACTION_LINKS,
} from "@/components/landing/landingPublicNav";

type ChromeVariant = "light" | "dark";

type Props = {
  variant?: ChromeVariant;
  className?: string;
};

export default function AppMobileSupportDrawer({
  variant = "dark",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panelBg =
    variant === "light" ? "bg-white text-slate-900" : "bg-slate-950 text-slate-100";
  const sectionLabel =
    variant === "light"
      ? "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
      : "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500";
  const itemClass =
    variant === "light"
      ? "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
      : "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10";
  const divider = variant === "light" ? "border-slate-200" : "border-slate-800";
  const triggerClass =
    variant === "light"
      ? "border-slate-200/90 bg-white text-[#1E293B] shadow-sm hover:bg-slate-50"
      : "border-white/15 bg-slate-900/70 text-slate-200 hover:bg-slate-900/85";

  return (
    <>
      <button
        type="button"
        className={`inline-flex min-h-[36px] items-center justify-center rounded-full border px-2.5 py-1 md:hidden ${triggerClass} ${className}`}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open documentation menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && mounted && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Documentation menu"
            >
              <button
                type="button"
                className="absolute inset-0 z-0 bg-black/45 backdrop-blur-[2px]"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              />
              <div
                className={`absolute inset-x-3 top-[calc(var(--ln-node-nav-chrome-block,3.5rem)+0.75rem)] bottom-3 z-10 flex flex-col overflow-hidden rounded-2xl border shadow-2xl ${panelBg} ${
                  variant === "light" ? "border-slate-200" : "border-slate-800"
                }`}
              >
                <div
                  className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${divider}`}
                >
                  <span className="text-sm font-semibold">Menu</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-2 opacity-70 transition hover:opacity-100"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  <p className={`mb-2 px-3 ${sectionLabel}`}>Documentation</p>
                  <ul className="space-y-0.5">
                    {LANDING_DOC_LINKS.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={itemClass}
                          onClick={() => setOpen(false)}
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-teal-500" />
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className={`mt-4 border-t pt-4 ${divider}`}>
                    <p className={`mb-2 px-3 ${sectionLabel}`}>Support</p>
                    <ul className="space-y-0.5">
                      {LANDING_SUPPORT_ACTION_LINKS.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className={itemClass}
                            onClick={() => setOpen(false)}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
