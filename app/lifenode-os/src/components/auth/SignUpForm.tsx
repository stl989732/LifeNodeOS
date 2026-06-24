"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { MailCheck, ShieldCheck, RefreshCw, Eye, EyeOff } from "lucide-react";
import PasswordField from "@/src/components/auth/PasswordField";
import AuthLegalFooter from "@/src/components/auth/AuthLegalFooter";
import {
  SECURITY_QUESTION_OPTIONS,
  SECURITY_QUESTIONS_REQUIRED,
} from "@/lib/security-questions";

type Props = {
  googleEnabled: boolean;
  githubEnabled: boolean;
};

type SecurityRow = {
  /** "" when the user hasn't picked yet */
  id: string;
  answer: string;
};

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | {
      kind: "activate";
      email: string;
      devLink: string | null;
      resending: boolean;
      resent: boolean;
    }
  | { kind: "error"; message: string };

const INITIAL_ROWS: SecurityRow[] = Array.from(
  { length: SECURITY_QUESTIONS_REQUIRED },
  () => ({ id: "", answer: "" })
);

export function SignUpForm({ googleEnabled, githubEnabled }: Props) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/shell";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<SecurityRow[]>(INITIAL_ROWS);
  const [revealedAnswers, setRevealedAnswers] = useState(
    () => Array.from({ length: SECURITY_QUESTIONS_REQUIRED }, () => false),
  );
  const [state, setState] = useState<State>({ kind: "idle" });

  // Each row's dropdown should hide questions already chosen above it, so the
  // operator can't accidentally pick the same question twice.
  const optionsFor = useMemo(
    () =>
      rows.map((row, idx) => {
        const usedByOthers = new Set(
          rows
            .map((r, i) => (i !== idx ? r.id : ""))
            .filter((id): id is string => Boolean(id))
        );
        return SECURITY_QUESTION_OPTIONS.filter(
          (opt) => !usedByOthers.has(opt.id) || opt.id === row.id
        );
      }),
    [rows]
  );

  const oauth = async (provider: "google" | "github") => {
    setState({ kind: "submitting" });
    await signIn(provider, { callbackUrl });
  };

  const updateRow = (
    idx: number,
    patch: Partial<SecurityRow>
  ) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "submitting" });

    const trimmedRows = rows
      .map((r) => ({ id: r.id.trim(), answer: r.answer.trim() }))
      .filter((r) => r.id !== "");
    if (trimmedRows.length < SECURITY_QUESTIONS_REQUIRED) {
      setState({
        kind: "error",
        message: `Pick and answer at least ${SECURITY_QUESTIONS_REQUIRED} security questions.`,
      });
      return;
    }
    if (trimmedRows.some((r) => !r.answer)) {
      setState({
        kind: "error",
        message: "Each security question needs an answer.",
      });
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          securityQuestions: trimmedRows,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        email?: string;
        devActivationLink?: string | null;
        activationLink?: string | null;
      };
      if (!res.ok || !data.ok) {
        setState({
          kind: "error",
          message: data.error ?? "Sign up failed.",
        });
        return;
      }
      setState({
        kind: "activate",
        email: data.email ?? email.trim(),
        devLink:
          data.activationLink ?? data.devActivationLink ?? null,
        resending: false,
        resent: false,
      });
    } catch {
      setState({ kind: "error", message: "Network error. Try again." });
    }
  };

  const onResend = async () => {
    if (state.kind !== "activate") return;
    setState({ ...state, resending: true });
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        devActivationLink?: string | null;
      };
      if (!res.ok || !data.ok) {
        setState({ ...state, resending: false });
        return;
      }
      setState({
        ...state,
        resending: false,
        resent: true,
        devLink: data.devActivationLink ?? state.devLink,
      });
    } catch {
      setState({ ...state, resending: false });
    }
  };

  if (state.kind === "activate") {
    return (
      <div className="space-y-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200">
            <MailCheck className="h-8 w-8" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            One more step — activate your email
          </h2>
          <p className="text-sm text-slate-400">
            We sent an activation link to{" "}
            <span className="font-mono text-slate-200">{state.email}</span>.
            Click it to unlock the Unified Hub, your Nodes, and Lino. The link
            expires in 24 hours.
          </p>
        </div>

        {state.devLink && (
          <div className="space-y-1 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[11px] text-cyan-100">
            <p className="font-semibold">
              Activate now (email delivery not configured yet):
            </p>
            <a
              className="block break-all underline text-cyan-50"
              href={state.devLink}
              rel="noreferrer"
            >
              {state.devLink}
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={() => void onResend()}
          disabled={state.resending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          {state.resending
            ? "Resending…"
            : state.resent
            ? "Resend again"
            : "Resend activation email"}
        </button>
        {state.resent && (
          <p className="text-center text-xs text-emerald-300">
            Fresh activation link sent.
          </p>
        )}

        <Link
          href="/auth/signin"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d]"
        >
          I activated — take me to sign in
        </Link>
      </div>
    );
  }

  const pending = state.kind === "submitting";

  return (
    <div className="space-y-6">
      {(googleEnabled || githubEnabled) && (
        <div className="space-y-3">
          {googleEnabled && (
            <button
              type="button"
              disabled={pending}
              onClick={() => void oauth("google")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.1] disabled:opacity-50"
            >
              Sign up with Google
            </button>
          )}
          {githubEnabled && (
            <button
              type="button"
              disabled={pending}
              onClick={() => void oauth("github")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-900 disabled:opacity-50"
            >
              Sign up with GitHub
            </button>
          )}
          <div className="relative py-2 text-center text-xs text-slate-500">
            <span className="bg-transparent px-2">or register with email</span>
          </div>
        </div>
      )}

      {!googleEnabled && !githubEnabled && (
        <p className="rounded-xl border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
          Add OAuth credentials to <code className="text-slate-300">.env.local</code>{" "}
          to enable one-click sign up with Google or GitHub.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Display name
          </span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/40 focus:ring-2"
          />
        </label>
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
        <PasswordField
          label="Password (min 8 characters)"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          helperText="Use at least 8 characters. Mix in numbers and a symbol for safety."
        />

        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Security questions
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                You&apos;ll answer these if you ever lose access to your password.
                Pick {SECURITY_QUESTIONS_REQUIRED} distinct questions.
              </p>
            </div>
          </div>

          {rows.map((row, idx) => (
            <div key={idx} className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Question {idx + 1}
                </span>
                <select
                  required
                  value={row.id}
                  onChange={(e) => updateRow(idx, { id: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none ring-cyan-400/40 focus:ring-2"
                >
                  <option value="">Choose a question…</option>
                  {optionsFor[idx].map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.question}
                    </option>
                  ))}
                </select>
              </label>
              <div className="relative">
                <input
                  type={revealedAnswers[idx] ? "text" : "password"}
                  autoComplete="off"
                  required
                  placeholder="Your answer"
                  value={row.answer}
                  onChange={(e) => updateRow(idx, { answer: e.target.value })}
                  disabled={!row.id}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 pr-12 text-sm text-slate-100 outline-none ring-cyan-400/40 focus:ring-2 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() =>
                    setRevealedAnswers((prev) =>
                      prev.map((v, i) => (i === idx ? !v : v)),
                    )
                  }
                  disabled={!row.id}
                  aria-pressed={revealedAnswers[idx]}
                  aria-label={
                    revealedAnswers[idx]
                      ? "Hide security answer"
                      : "Show security answer"
                  }
                  className="absolute inset-y-0 right-2 inline-flex h-full items-center justify-center px-2 text-slate-400 transition hover:text-slate-200 focus:outline-none focus-visible:text-slate-100 disabled:opacity-40"
                >
                  {revealedAnswers[idx] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {state.kind === "error" && (
          <p className="text-sm text-rose-300" role="alert">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d] disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          href="/auth/signin"
          className="font-semibold text-cyan-300 hover:text-cyan-200"
        >
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-400">
          ← Back to home
        </Link>
      </p>
      <AuthLegalFooter />
    </div>
  );
}
