"use client";

import IntegrationLogo from "./IntegrationLogo";
import InboxLabelChips, { readLabelNames } from "./InboxLabelChips";
import type { InboxClientItem } from "@/src/lib/orchestrator/inboxDb";
import { isSentMailboxItem } from "@/src/lib/orchestrator/inboxMailbox";
import type { InboxSource } from "@/src/lib/orchestrator/types";
import { encodeInboxDrag, INBOX_DRAG_MIME } from "@/src/lib/orchestrator/inboxDrag";

export type InboxListFilter = InboxSource | "all" | "sent";

type Props = {
  items: InboxClientItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sourceFilter: InboxListFilter;
  onSourceFilter: (f: InboxListFilter) => void;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const FILTERS: { id: InboxListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gmail", label: "Gmail" },
  { id: "sent", label: "Sent" },
  { id: "slack", label: "Slack" },
  { id: "google_calendar", label: "Calendar" },
];

function filterItems(
  items: InboxClientItem[],
  sourceFilter: InboxListFilter,
): InboxClientItem[] {
  if (sourceFilter === "sent") {
    return items.filter((i) => isSentMailboxItem(i.providerPayload));
  }
  if (sourceFilter === "all") {
    return items.filter((i) => !isSentMailboxItem(i.providerPayload));
  }
  return items.filter(
    (i) =>
      i.source === sourceFilter && !isSentMailboxItem(i.providerPayload),
  );
}

export default function InboxList({
  items,
  selectedId,
  onSelect,
  sourceFilter,
  onSourceFilter,
}: Props) {
  const filtered = filterItems(items, sourceFilter);

  return (
    <div className="flex h-full min-w-0 flex-col border-r border-slate-200/80 bg-[#F8F8FF]/80">
      <div className="flex flex-wrap gap-1 border-b border-slate-200/80 p-2 sm:p-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSourceFilter(f.id)}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px] ${
              sourceFilter === f.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {f.id !== "all" && f.id !== "sent" ? (
              <IntegrationLogo source={f.id} size={14} />
            ) : null}
            {f.label}
          </button>
        ))}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-500 sm:px-4 sm:py-10 sm:text-sm">
            {sourceFilter === "sent"
              ? "No sent messages yet. Sync Gmail to load your Sent mailbox."
              : "No items yet. Connect apps and sync."}
          </li>
        ) : null}
        {filtered.map((it) => {
          const active = it.id === selectedId;
          const labels = readLabelNames(it.providerPayload);
          const sent = isSentMailboxItem(it.providerPayload);
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
                className={`w-full rounded-xl border px-2.5 py-2 text-left transition sm:px-3 sm:py-2.5 ${
                  active
                    ? "border-sky-300 bg-white shadow-sm ring-1 ring-sky-200"
                    : "border-transparent bg-white/70 hover:border-slate-200 hover:bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <IntegrationLogo source={it.source} size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {it.title}
                      </div>
                      {sent ? (
                        <span className="shrink-0 rounded bg-slate-200/80 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                          Sent
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {sent ? `To: ${it.fromLabel ?? "—"}` : it.fromLabel ?? "—"}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {it.snippet}
                    </p>
                    {labels.length > 0 ? (
                      <InboxLabelChips labels={labels.slice(0, 2)} className="mt-1.5" />
                    ) : null}
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
