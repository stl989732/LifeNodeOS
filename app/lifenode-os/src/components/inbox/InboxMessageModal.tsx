"use client";

import { useEffect, useState } from "react";
import { Archive, ExternalLink, Loader2, Send, Trash2, X } from "lucide-react";
import type { InboxClientItem } from "@/src/lib/orchestrator/inboxDb";
import IntegrationLogo, { integrationLabel } from "./IntegrationLogo";
import InboxLabelChips, { readLabelNames } from "./InboxLabelChips";
import InboxMessageBody from "./InboxMessageBody";
import InboxTransferPanel from "./InboxTransferPanel";

type Props = {
  item: InboxClientItem | null;
  open: boolean;
  loading: boolean;
  transferBusy: boolean;
  onClose: () => void;
  onArchive: () => Promise<void>;
  onReply: (text: string) => Promise<void>;
  onTransfer: (body: Record<string, unknown>) => Promise<void>;
};

type ReplyProps = {
  onReply: (text: string) => Promise<void>;
};

function InboxReplyComposer({ onReply }: ReplyProps) {
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);

  return (
    <footer className="shrink-0 border-t border-slate-200 p-4">
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
  );
}

export default function InboxMessageModal({
  item,
  open,
  loading,
  transferBusy,
  onClose,
  onArchive,
  onReply,
  onTransfer,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const canReply = item.source === "gmail" || item.source === "slack";
  const labels = readLabelNames(item.providerPayload);
  const externalUrl =
    typeof item.providerPayload?.externalUrl === "string"
      ? item.providerPayload.externalUrl
      : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close message"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inbox-message-title"
        className="relative z-[201] flex h-[min(92dvh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-slate-200 px-5 py-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <IntegrationLogo source={item.source} size={22} />
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {integrationLabel(item.source)}
                </span>
                {item.status !== "inbox" ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                    {item.status}
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {externalUrl ? (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    title="Open in provider"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void onArchive()}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  title="Archive"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void onArchive()}
                  className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <h2
              id="inbox-message-title"
              className="text-xl font-bold leading-snug text-slate-900"
            >
              {item.title}
            </h2>
            {item.fromLabel ? (
              <p className="mt-1 text-sm text-slate-600">{item.fromLabel}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">
              {new Date(item.receivedAt).toLocaleString()}
            </p>
            <InboxLabelChips labels={labels} className="mt-3" />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <InboxMessageBody item={item} loading={loading} />
          </div>

          {canReply ? (
            <InboxReplyComposer key={item.id} onReply={onReply} />
          ) : null}
        </div>

        <div className="w-full shrink-0 border-t border-slate-200 sm:w-72 sm:border-l sm:border-t-0 lg:w-80">
          <InboxTransferPanel
            item={item}
            busy={transferBusy}
            onTransfer={onTransfer}
          />
        </div>
      </div>
    </div>
  );
}
