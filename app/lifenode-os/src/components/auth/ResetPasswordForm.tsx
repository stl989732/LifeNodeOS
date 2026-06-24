"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import PasswordField from "@/src/components/auth/PasswordField";

type PublicQuestion = { id: string; question: string };

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; emailMasked: string; questions: PublicQuestion[] }
  | { kind: "invalid"; message: string };

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success" };

export default function ResetPasswordForm({ token }: { token: string }) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          emailMasked?: string;
          securityQuestions?: PublicQuestion[];
        };
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.securityQuestions) {
          setLoad({
            kind: "invalid",
            message:
              data.error ?? "This reset link has expired or already been used.",
          });
          return;
        }
        setLoad({
          kind: "ready",
          emailMasked: data.emailMasked ?? "",
          questions: data.securityQuestions,
        });
      } catch {
        if (cancelled) return;
        setLoad({
          kind: "invalid",
          message: "We couldn't load this reset link. Try again later.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const ready = load.kind === "ready" ? load : null;

  const canSubmit = useMemo(() => {
    if (!ready) return false;
    if (submit.kind === "submitting") return false;
    if (password.length < 8 || password !== confirm) return false;
    return ready.questions.every(
      (q) => (answers[q.id] ?? "").trim().length > 0
    );
  }, [ready, submit, password, confirm, answers]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (password !== confirm) {
      setSubmit({
        kind: "error",
        message: "Passwords don't match.",
      });
      return;
    }
    setSubmit({ kind: "submitting" });
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: password,
          answers: ready.questions.map((q) => ({
            id: q.id,
            answer: answers[q.id] ?? "",
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setSubmit({
          kind: "error",
          message: data.error ?? "Could not reset your password.",
        });
        return;
      }
      setSubmit({ kind: "success" });
    } catch {
      setSubmit({
        kind: "error",
        message: "Network error. Try again.",
      });
    }
  };

  if (load.kind === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your security challenge…
      </div>
    );
  }

  if (load.kind === "invalid") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-400/15 text-rose-300">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">
            Link no longer valid
          </h2>
          <p className="text-sm text-slate-400">{load.message}</p>
        </div>
        <Link
          href="/auth/forgot-password"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d]"
        >
          Request a new recovery link
        </Link>
      </div>
    );
  }

  if (submit.kind === "success") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <CheckCircle2 className="h-9 w-9" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">
            Password updated
          </h2>
          <p className="text-sm text-slate-400">
            You&apos;re all set. Sign in with your new password.
          </p>
        </div>
        <Link
          href="/auth/signin"
          className="inline-block rounded-xl bg-[#1E293B] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-xs text-cyan-100">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <p className="font-semibold text-cyan-50">
            Resetting password for {ready!.emailMasked || "your account"}
          </p>
          <p className="text-cyan-100/85">
            Answer your security questions and choose a new password. Answers
            are case-insensitive and trimmed of extra spaces.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {ready!.questions.map((q) => (
          <label key={q.id} className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              {q.question}
            </span>
            <input
              type="text"
              autoComplete="off"
              required
              value={answers[q.id] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
              }
              className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/40 focus:ring-2"
            />
          </label>
        ))}
      </div>

      <PasswordField
        label="New password (min 8 characters)"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={8}
      />
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        minLength={8}
      />

      {password.length > 0 && confirm.length > 0 && password !== confirm && (
        <p className="text-xs text-rose-300">Passwords don&apos;t match.</p>
      )}

      {submit.kind === "error" && (
        <p className="text-sm text-rose-300" role="alert">
          {submit.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d] disabled:opacity-50"
      >
        {submit.kind === "submitting" ? "Updating…" : "Update password"}
      </button>

      <p className="text-center text-xs text-slate-500">
        <Link href="/auth/signin" className="hover:text-slate-300">
          ← Back to sign in
        </Link>
      </p>
    </form>
  );
}
