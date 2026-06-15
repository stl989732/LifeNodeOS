"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    <footer className="shrink-0 border-t border-slate-200 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:p-4 md:pb-4">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Draft a reply…"
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-[#0C121A] outline-none placeholder:text-slate-400 focus:border-sky-400 md:rounded-xl md:px-3 md:py-2 md:text-sm"
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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

  if (!open || !item || !mounted) return null;

  const canReply = item.source === "gmail" || item.source === "slack";
  const labels = readLabelNames(item.providerPayload);
  const externalUrl =
    typeof item.providerPayload?.externalUrl === "string"
      ? item.providerPayload.externalUrl
      : null;

  const receivedShort = new Date(item.receivedAt).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const modal = (
    <div className="fixed inset-0 z-[200] md:flex md:items-center md:justify-center md:p-6">
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
        className="relative z-[201] flex h-full w-full max-w-none flex-col overflow-hidden border-0 bg-white pt-[env(safe-area-inset-top,0px)] shadow-2xl md:h-[min(92dvh,900px)] md:max-w-5xl md:flex-row md:rounded-2xl md:border md:border-slate-200 md:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-slate-200 px-3 py-2 md:px-5 md:py-4">
            <div className="mb-1 flex items-center justify-between gap-2 md:mb-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
                <IntegrationLogo source={item.source} size={16} />
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-600 md:px-2 md:text-[10px]">
                  {integrationLabel(item.source)}
                </span>
                {item.status !== "inbox" ? (
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 md:text-[10px]">
                    {item.status}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 md:hidden"
                aria-label="Close message"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <div className="hidden shrink-0 items-center gap-0.5 md:flex">
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
              className="line-clamp-2 text-xs font-bold leading-snug text-[#0C121A] md:line-clamp-none md:text-xl"
            >
              {item.title}
            </h2>
            <p className="mt-0.5 truncate text-[10px] text-slate-600 md:mt-1 md:text-sm">
              {item.fromLabel ? (
                <>
                  <span className="font-medium">{item.fromLabel}</span>
                  <span className="text-slate-400"> · </span>
                </>
              ) : null}
              <span className="text-slate-500">{receivedShort}</span>
            </p>
            <InboxLabelChips
              labels={labels.slice(0, 4)}
              className="mt-1 md:mt-3"
              compact
            />
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

  return createPortal(modal, document.body);
}
