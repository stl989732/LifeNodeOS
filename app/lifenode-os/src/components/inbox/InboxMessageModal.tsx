"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Send,
  Trash2,
  X,
} from "lucide-react";
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
    <footer className="shrink-0 border-t border-slate-200 p-2.5 md:p-4">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Draft a reply…"
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-sky-400 md:rounded-xl md:px-3 md:py-2 md:text-sm"
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
        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800 disabled:opacity-50 md:mt-2 md:rounded-xl md:px-4 md:py-2 md:text-xs"
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
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    setTransferOpen(false);
  }, [item?.id]);

  if (!open || !item) return null;

  const canReply = item.source === "gmail" || item.source === "slack";
  const labels = readLabelNames(item.providerPayload);
  const externalUrl =
    typeof item.providerPayload?.externalUrl === "string"
      ? item.providerPayload.externalUrl
      : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center md:p-6">
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
        className="relative z-[201] flex h-[min(96dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-var(--ln-mobile-bottom-nav-block,0px)-0.5rem))] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl md:h-[min(92dvh,900px)] md:flex-row md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-slate-200 px-3 py-2.5 md:px-5 md:py-4">
            <div className="mb-1 flex items-start justify-between gap-2 md:mb-2 md:gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 md:gap-2">
                <IntegrationLogo source={item.source} size={18} />
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600 md:text-[10px]">
                  {integrationLabel(item.source)}
                </span>
                {item.status !== "inbox" ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                    {item.status}
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {externalUrl ? (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:p-2"
                    title="Open in provider"
                  >
                    <ExternalLink className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void onArchive()}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:p-2"
                  title="Archive"
                >
                  <Archive className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void onArchive()}
                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 md:p-2"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:p-2"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </div>
            </div>
            <h2
              id="inbox-message-title"
              className="text-sm font-bold leading-snug text-slate-900 md:text-xl"
            >
              {item.title}
            </h2>
            {item.fromLabel ? (
              <p className="mt-0.5 text-[11px] text-slate-600 md:mt-1 md:text-sm">
                {item.fromLabel}
              </p>
            ) : null}
            <p className="mt-0.5 text-[10px] text-slate-400 md:mt-1 md:text-xs">
              {new Date(item.receivedAt).toLocaleString()}
            </p>
            <InboxLabelChips labels={labels} className="mt-1.5 md:mt-3" />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5 md:px-5 md:py-5">
            <InboxMessageBody item={item} loading={loading} />
          </div>

          {/* Mobile / narrow: collapsible transfer drawer (closed by default) */}
          <div className="shrink-0 border-t border-slate-200 md:hidden">
            <button
              type="button"
              aria-expanded={transferOpen}
              onClick={() => setTransferOpen((open) => !open)}
              className="flex w-full items-center justify-between bg-slate-50 px-3 py-2 text-left"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Transfer options
              </span>
              {transferOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
              )}
            </button>
            {transferOpen ? (
              <div className="max-h-[38dvh] overflow-y-auto border-t border-slate-100 bg-white">
                <InboxTransferPanel
                  item={item}
                  busy={transferBusy}
                  onTransfer={onTransfer}
                  compact
                />
              </div>
            ) : null}
          </div>

          {canReply ? (
            <InboxReplyComposer key={item.id} onReply={onReply} />
          ) : null}
        </div>

        {/* Desktop: fixed transfer sidebar */}
        <div className="hidden w-72 shrink-0 border-l border-slate-200 md:block lg:w-80">
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
