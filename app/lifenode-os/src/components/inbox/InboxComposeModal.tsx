"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Send, X } from "lucide-react";
import IntegrationLogo from "./IntegrationLogo";

type Props = {
  open: boolean;
  onClose: () => void;
  onSend: (input: { to: string; subject: string; text: string }) => Promise<void>;
  gmailConnected: boolean;
};

export default function InboxComposeModal({
  open,
  onClose,
  onSend,
  gmailConnected,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [composerHeight, setComposerHeight] = useState(160);
  const toRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTo("");
    setSubject("");
    setBody("");
    setSendError(null);
    const t = window.setTimeout(() => toRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

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

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { startY: e.clientY, startHeight: composerHeight };
  }, [composerHeight]);

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const delta = resizeRef.current.startY - e.clientY;
    const next = Math.min(360, Math.max(120, resizeRef.current.startHeight + delta));
    setComposerHeight(next);
  }, []);

  const onResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const canSend =
    gmailConnected &&
    to.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    !sending;

  if (!open || !mounted) return null;

  const modal = (
    <div className="fixed inset-0 z-[200] md:flex md:items-center md:justify-center md:p-6">
      <button
        type="button"
        aria-label="Close compose"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inbox-compose-title"
        className="relative z-[201] flex h-full w-full max-w-none flex-col overflow-hidden border-0 bg-white pt-[env(safe-area-inset-top,0px)] shadow-2xl md:h-auto md:max-h-[min(92dvh,720px)] md:max-w-xl md:rounded-2xl md:border md:border-slate-200 md:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 md:px-5 md:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <IntegrationLogo source="gmail" size={18} />
            <h2
              id="inbox-compose-title"
              className="text-sm font-bold text-[#0C121A] md:text-lg"
            >
              New message
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-4">
          {sendError ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-900 md:text-sm">
              {sendError}
            </p>
          ) : null}
          {!gmailConnected ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 md:text-sm">
              Connect Gmail in the integrations panel to compose and send email.
            </p>
          ) : null}

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                To
              </span>
              <input
                ref={toRef}
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="name@example.com"
                disabled={!gmailConnected}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-[#0C121A] outline-none placeholder:text-slate-400 focus:border-sky-400 disabled:bg-slate-50 md:rounded-xl md:px-3 md:text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Subject
              </span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                disabled={!gmailConnected}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-[#0C121A] outline-none placeholder:text-slate-400 focus:border-sky-400 disabled:bg-slate-50 md:rounded-xl md:px-3 md:text-sm"
              />
            </label>
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Message
              </span>
              <div
                role="separator"
                aria-label="Drag to resize message box"
                className="mx-auto mb-1.5 flex h-3 w-14 cursor-ns-resize items-center justify-center rounded-full hover:bg-slate-100"
                onPointerDown={onResizePointerDown}
                onPointerMove={onResizePointerMove}
                onPointerUp={onResizePointerUp}
                onPointerCancel={onResizePointerUp}
              >
                <span className="h-1 w-8 rounded-full bg-slate-300" />
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
                disabled={!gmailConnected}
                style={{ height: composerHeight }}
                className="w-full resize-none overflow-y-auto rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-[#0C121A] outline-none placeholder:text-slate-400 focus:border-sky-400 disabled:bg-slate-50 md:rounded-xl md:px-3 md:py-2 md:text-sm"
              />
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:p-4 md:pb-4">
          <button
            type="button"
            disabled={!canSend}
            onClick={async () => {
              setSending(true);
              setSendError(null);
              try {
                await onSend({
                  to: to.trim(),
                  subject: subject.trim(),
                  text: body.trim(),
                });
                onClose();
              } catch (e) {
                setSendError(
                  e instanceof Error ? e.message : "Failed to send message",
                );
              } finally {
                setSending(false);
              }
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-50 md:rounded-xl md:text-xs"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send message
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
