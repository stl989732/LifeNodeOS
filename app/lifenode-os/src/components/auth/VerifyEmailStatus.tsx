"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailWarning, RefreshCw } from "lucide-react";

type Status = "ok" | "invalid" | "missing" | "error" | "pending";

function asStatus(raw: string | null): Status {
  if (raw === "ok" || raw === "invalid" || raw === "missing" || raw === "error") {
    return raw;
  }
  return "pending";
}

export default function VerifyEmailStatus() {
  const params = useSearchParams();
  const status = asStatus(params.get("status"));
  const presetEmail = params.get("email") ?? "";

  const [email, setEmail] = useState(presetEmail);
  const [resendState, setResendState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; devLink?: string | null }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const onResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendState({ kind: "sending" });
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        devActivationLink?: string | null;
      };
      if (!res.ok || !data.ok) {
        setResendState({
          kind: "error",
          message: data.error ?? "Could not resend the activation email.",
        });
        return;
      }
      setResendState({
        kind: "sent",
        devLink: data.devActivationLink ?? null,
      });
    } catch {
      setResendState({
        kind: "error",
        message: "Network error. Try again in a moment.",
      });
    }
  };

  if (status === "ok") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <CheckCircle2 className="h-9 w-9" aria-hidden />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">
            You&apos;re activated.
          </h2>
          <p className="text-sm text-slate-400">
            Your LifeNode OS account is live. Sign in to assemble your Nodes.
          </p>
        </div>
        <Link
          href="/auth/signin"
          className="inline-block rounded-xl bg-[#1E293B] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d]"
        >
          Sign in to LifeNode OS
        </Link>
      </div>
    );
  }

  const isBroken =
    status === "invalid" || status === "missing" || status === "error";

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
          <MailWarning className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">
          {isBroken ? "That link didn't work" : "Check your email"}
        </h2>
        <p className="text-sm text-slate-400">
          {isBroken
            ? "The activation link is missing, expired, or already used. Send yourself a fresh one."
            : "We sent an activation link to your inbox. Click it to unlock the Unified Hub."}
        </p>
      </div>

      <form onSubmit={onResend} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/40 focus:ring-2"
          />
        </label>
        <button
          type="submit"
          disabled={resendState.kind === "sending"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d] disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          {resendState.kind === "sending"
            ? "Sending…"
            : "Resend activation email"}
        </button>
      </form>

      {resendState.kind === "sent" && (
        <div className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
          <p>
            If an unverified account exists for that email, a fresh activation
            link is on its way.
          </p>
          {resendState.devLink ? (
            <p className="break-all text-emerald-200/90">
              Dev shortcut:{" "}
              <a
                className="underline"
                href={resendState.devLink}
                rel="noreferrer"
              >
                {resendState.devLink}
              </a>
            </p>
          ) : null}
        </div>
      )}
      {resendState.kind === "error" && (
        <p className="text-sm text-rose-300" role="alert">
          {resendState.message}
        </p>
      )}

      <p className="text-center text-xs text-slate-500">
        <Link href="/auth/signin" className="hover:text-slate-300">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
