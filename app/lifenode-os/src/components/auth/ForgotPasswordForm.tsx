"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ShieldQuestion, CheckCircle2 } from "lucide-react";
import AuthLegalFooter from "@/src/components/auth/AuthLegalFooter";

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; devLink: string | null }
  | { kind: "no-questions" }
  | { kind: "error"; message: string };

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        reason?: "NO_SECURITY_QUESTIONS";
        devResetLink?: string | null;
      };
      if (!res.ok) {
        setState({
          kind: "error",
          message: data.error ?? "Could not start password recovery.",
        });
        return;
      }
      if (data.reason === "NO_SECURITY_QUESTIONS") {
        setState({ kind: "no-questions" });
        return;
      }
      setState({
        kind: "sent",
        devLink: data.devResetLink ?? null,
      });
    } catch {
      setState({
        kind: "error",
        message: "Network error. Try again in a moment.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200">
          <ShieldQuestion className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-sm text-slate-400">
          Enter the email on your LifeNode OS account. We'll send a recovery
          link that asks your security questions before letting you set a new
          password.
        </p>
      </div>

      {state.kind === "sent" ? (
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-50">
                  Check your inbox.
                </p>
                <p className="text-emerald-100/85">
                  If an account exists for that email, you'll get a message
                  titled “Reset your LifeNode OS password.” Open it, answer
                  your security questions, and pick a new password. The link
                  expires in 1 hour.
                </p>
              </div>
            </div>
            {state.devLink && (
              <p className="break-all rounded bg-black/30 px-2 py-1 text-[11px] text-emerald-100/90">
                Dev shortcut:{" "}
                <a className="underline" href={state.devLink} rel="noreferrer">
                  {state.devLink}
                </a>
              </p>
            )}
          </div>
          <Link
            href="/auth/signin"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d]"
          >
            Back to sign in
          </Link>
        </div>
      ) : state.kind === "no-questions" ? (
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
            <p className="font-semibold text-amber-50">
              We can't verify your identity yet.
            </p>
            <p className="text-amber-100/85">
              This account was created before security questions were enabled.
              Sign in with your password (or OAuth) once and set up recovery
              questions from your profile, or contact the operator to reset
              manually.
            </p>
          </div>
          <Link
            href="/auth/signin"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d]"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
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
          {state.kind === "error" && (
            <p className="text-sm text-rose-300" role="alert">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={state.kind === "submitting"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d] disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {state.kind === "submitting"
              ? "Sending…"
              : "Send recovery email"}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-slate-500">
        <Link href="/auth/signin" className="hover:text-slate-300">
          ← Back to sign in
        </Link>
      </p>
      <AuthLegalFooter />
    </div>
  );
}
