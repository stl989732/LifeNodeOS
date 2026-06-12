"use client";

import { Mail, MessageSquare, CalendarRange } from "lucide-react";
import type { InboxClientItem } from "@/src/lib/orchestrator/inboxDb";
import type { InboxSource } from "@/src/lib/orchestrator/types";
import { encodeInboxDrag, INBOX_DRAG_MIME } from "@/src/lib/orchestrator/inboxDrag";

type Props = {
  items: InboxClientItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sourceFilter: InboxSource | "all";
  onSourceFilter: (f: InboxSource | "all") => void;
};

function SourceIcon({ source }: { source: string }) {
  if (source === "gmail") return <Mail className="h-3.5 w-3.5 text-rose-500" />;
  if (source === "slack")
    return <MessageSquare className="h-3.5 w-3.5 text-violet-500" />;
  return <CalendarRange className="h-3.5 w-3.5 text-sky-600" />;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const FILTERS: { id: InboxSource | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gmail", label: "Gmail" },
  { id: "slack", label: "Slack" },
  { id: "google_calendar", label: "Calendar" },
];

export default function InboxList({
  items,
  selectedId,
  onSelect,
  sourceFilter,
  onSourceFilter,
}: Props) {
  const filtered =
    sourceFilter === "all"
      ? items
      : items.filter((i) => i.source === sourceFilter);

  return (
    <div className="flex h-full min-w-0 flex-col border-r border-slate-200/80 bg-[#F8F8FF]/80">
      <div className="flex flex-wrap gap-1 border-b border-slate-200/80 p-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSourceFilter(f.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
              sourceFilter === f.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No items yet. Connect apps and sync.
          </li>
        ) : null}
        {filtered.map((it) => {
          const active = it.id === selectedId;
          return (
            <li key={it.id} className="mb-1">
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  const payload = encodeInboxDrag({
                    inboxItemId: it.id,
                    source: it.source,
                  });
                  e.dataTransfer.setData(INBOX_DRAG_MIME, payload);
                  e.dataTransfer.setData("text/plain", payload);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => onSelect(it.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-sky-300 bg-white shadow-sm ring-1 ring-sky-200"
                    : "border-transparent bg-white/70 hover:border-slate-200 hover:bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <SourceIcon source={it.source} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {it.title}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {it.fromLabel ?? "—"}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {it.snippet}
                    </p>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {formatWhen(it.receivedAt)}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
