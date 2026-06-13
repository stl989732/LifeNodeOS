"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AlertTriangle, Download, X } from "lucide-react";

type Step = "warning" | "export" | "confirm";

type Props = {
  open: boolean;
  onClose: () => void;
  onExportData: () => void;
  onConfirmDelete: (confirmPhrase: string) => void | Promise<void>;
  userEmail?: string | null;
};

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export default function AccountDeletionModal({
  open,
  onClose,
  onExportData,
  onConfirmDelete,
  userEmail,
}: Props) {
  const titleId = useId();
  const [step, setStep] = useState<Step>("warning");
  const [phrase, setPhrase] = useState("");
  const [exported, setExported] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("warning");
    setPhrase("");
    setExported(false);
    setDeleting(false);
    setDeleteError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, deleting, handleClose]);

  if (!open) return null;

  const phraseOk = phrase.trim().toUpperCase() === CONFIRM_PHRASE;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        aria-label="Close"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[401] w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1419] p-6 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Delete account
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "warning" ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-300">
              This will permanently delete your workspaces, task histories, LifePulse
              plans, connected integrations, and all trained AI context.{" "}
              <strong className="text-white">This action cannot be undone.</strong>
            </p>
            {userEmail ? (
              <p className="text-xs text-slate-500">
                Account: <span className="text-slate-300">{userEmail}</span>
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("export")}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === "export" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Export a copy of your LifeNode OS data before you delete. We include
              profile settings, enabled nodes, and local preferences (JSON).
            </p>
            <button
              type="button"
              onClick={() => {
                onExportData();
                setExported(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-400/40 bg-teal-500/15 px-4 py-3 text-sm font-semibold text-teal-100 hover:bg-teal-500/25"
            >
              <Download className="h-4 w-4" />
              Export my data
            </button>
            {exported ? (
              <p className="text-center text-xs text-teal-300/90">
                Download started — keep this file safe.
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep("warning")}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
              >
                Continue to final step
              </button>
            </div>
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Type{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-rose-200">
                {CONFIRM_PHRASE}
              </code>{" "}
              to enable permanent deletion.
            </p>
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-rose-400/50 focus:outline-none focus:ring-1 focus:ring-rose-400/40"
              autoComplete="off"
            />
            {deleteError ? (
              <p className="text-sm text-rose-300" role="alert">
                {deleteError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setStep("export")}
                className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!phraseOk || deleting}
                onClick={() => {
                  void (async () => {
                    setDeleting(true);
                    setDeleteError(null);
                    try {
                      await onConfirmDelete(phrase.trim());
                      handleClose();
                    } catch (e) {
                      setDeleteError(
                        e instanceof Error
                          ? e.message
                          : "Could not delete your account. Try again.",
                      );
                    } finally {
                      setDeleting(false);
                    }
                  })();
                }}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete my account permanently"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
