"use client";

import { useEffect, useRef, useState } from "react";
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

  const pickJson = () => {
    downloadVanodeJsonBackup(data);
    setOpen(false);
  };

  const pickReport = () => {
    downloadVanodeHumanReadableReport(data);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
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

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-solid border-white/20 bg-white/95 p-1.5 shadow-[0_16px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
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
        </div>
      ) : null}
    </div>
  );
}
