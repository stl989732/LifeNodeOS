"use client";

import { useEffect, useState } from "react";
import { Archive, Loader2, Send, Trash2 } from "lucide-react";
import type { InboxClientItem } from "@/src/lib/orchestrator/inboxDb";

type Props = {
  item: InboxClientItem | null;
  onArchive: () => Promise<void>;
  onReply: (text: string) => Promise<void>;
  loading: boolean;
};

function sourceLabel(source: string) {
  if (source === "gmail") return "Gmail";
  if (source === "slack") return "Slack";
  if (source === "google_calendar") return "Google Calendar";
  return source;
}

export default function InboxDetailPane({
  item,
  onArchive,
  onReply,
  loading,
}: Props) {
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    setDraft("");
  }, [item?.id]);

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Select a message to view details.
      </div>
    );
  }

  const canReply = item.source === "gmail" || item.source === "slack";

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <header className="border-b border-slate-200/80 px-5 py-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {sourceLabel(item.source)}
          </span>
          {item.status !== "inbox" ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              {item.status}
            </span>
          ) : null}
        </div>
        <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
        {item.fromLabel ? (
          <p className="mt-1 text-sm text-slate-600">{item.fromLabel}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-400">
          {new Date(item.receivedAt).toLocaleString()}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onArchive()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
          <button
            type="button"
            onClick={() => void onArchive()}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading full content…
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {item.body?.trim() || item.snippet || "No content."}
          </div>
        )}
      </div>

      {canReply ? (
        <footer className="border-t border-slate-200/80 p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Draft a reply…"
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
          <button
            type="button"
            disabled={!draft.trim() || replying}
            onClick={async () => {
              setReplying(true);
              try {
                await onReply(draft.trim());
                setDraft("");
              } finally {
                setReplying(false);
              }
            }}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {replying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send reply
          </button>
        </footer>
      ) : null}
    </div>
  );
}
