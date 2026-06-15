"use client";

import { useState } from "react";
import { Calendar, Inbox, Send } from "lucide-react";
import type { InboxClientItem } from "@/src/lib/orchestrator/inboxDb";

type Props = {
  item: InboxClientItem | null;
  onTransfer: (body: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  compact?: boolean;
};

export default function InboxTransferPanel({
  item,
  onTransfer,
  busy,
  compact = false,
}: Props) {
  const [pickDate, setPickDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-slate-500">
        Select an item to schedule or transfer it.
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 bg-white/60 ${
        compact
          ? "p-3"
          : "h-full gap-3 border-l border-slate-200/80 p-4"
      }`}
    >
      {!compact ? (
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Transfer
        </h3>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void onTransfer({ type: "backlog" })}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onTransfer({ type: "backlog" });
        }}
        className={`flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white text-left font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 ${
          compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm"
        }`}
      >
        <Inbox className="h-3.5 w-3.5 shrink-0 text-slate-500 sm:h-4 sm:w-4" />
        Add to backlog
        <span className="ml-auto text-[10px] font-bold text-slate-400">Z</span>
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => void onTransfer({ type: "today" })}
        className={`flex w-full items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-left font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50 ${
          compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm"
        }`}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        Add to today
        <span className="ml-auto text-[10px] font-bold text-sky-600">S</span>
      </button>

      <div className={`rounded-xl border border-slate-200 bg-white ${compact ? "p-2.5" : "p-3"}`}>
        <label className="mb-1.5 block text-[11px] font-semibold text-slate-600 sm:text-xs">
          Pick a day
        </label>
        <input
          type="date"
          value={pickDate}
          onChange={(e) => setPickDate(e.target.value)}
          className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs sm:text-sm"
        />
        <button
          type="button"
          disabled={busy || !pickDate}
          onClick={() => void onTransfer({ type: "date", date: pickDate })}
          className="w-full rounded-lg bg-slate-900 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-50 sm:py-2 sm:text-xs"
        >
          Schedule
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">
          Send to node
        </p>
        {(
          [
            { node: "biz", label: "BizNode pipeline" },
            { node: "va", label: "VANode vault" },
            { node: "home", label: "HomeNode calendar" },
          ] as const
        ).map(({ node, label }) => (
          <button
            key={node}
            type="button"
            disabled={busy}
            onClick={() => void onTransfer({ type: "node", node })}
            className={`flex w-full items-center gap-2 rounded-lg border border-slate-200 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${
              compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
            }`}
          >
            <Send className="h-3.5 w-3.5 text-slate-400" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
