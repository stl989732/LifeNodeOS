"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Download, FileJson, FileText } from "lucide-react";
import type { VanodePersisted } from "@/lib/vanode/types";
import {
  downloadVanodeHumanReadableReport,
  downloadVanodeJsonBackup,
} from "@/lib/vanode/export-backup";

type Props = {
  data: VanodePersisted;
};

export function VanodeExportBackupMenu({ data }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    const placeMenu = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(window.innerWidth - 16, 352);
      setMenuPos({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - width),
        width,
      });
    };
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const portal = document.getElementById("vanode-export-menu-portal");
      if (portal?.contains(target)) return;
      setOpen(false);
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

  const pickJson = () => {
    downloadVanodeJsonBackup(data);
    setOpen(false);
  };

  const pickReport = () => {
    downloadVanodeHumanReadableReport(data);
    setOpen(false);
  };

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            id="vanode-export-menu-portal"
            role="menu"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 120,
            }}
            className="overflow-hidden rounded-2xl border border-solid border-white/20 bg-white/95 p-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
          >
            <button
              type="button"
              role="menuitem"
              onClick={pickJson}
              className="flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100/90 dark:hover:bg-white/10"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <FileJson className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Download System Backup (.json)
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  For restoring your data or migrating your dashboard settings.
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={pickReport}
              className="mt-0.5 flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100/90 dark:hover:bg-white/10"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Download Human-Readable Report (.md)
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  A clean, structured summary of your workspace, tools, and
                  configurations.
                </span>
              </span>
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-xl border border-solid border-white/10 bg-white/50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-[12px] transition hover:bg-white/70"
      >
        <Download className="h-4 w-4" strokeWidth={1.75} />
        Export backup
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      {menu}
    </div>
  );
}
