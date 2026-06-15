"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { MailWarning, RefreshCw } from "lucide-react";
import PasswordField from "@/src/components/auth/PasswordField";
import AuthLegalFooter from "@/src/components/auth/AuthLegalFooter";

type Props = {
  googleEnabled: boolean;
  githubEnabled: boolean;
};

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "invalid"; message: string }
  | {
      kind: "unverified";
      email: string;
      resending: boolean;
      resent: boolean;
      devLink: string | null;
      error: string | null;
    };

export function SignInForm({ googleEnabled, githubEnabled }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/shell";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });

  const pending =
    state.kind === "submitting" ||
    (state.kind === "unverified" && state.resending);

  const onCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "submitting" });
    try {
      const precheck = await fetch("/api/auth/check-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const verdict = (await precheck.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: "INVALID" | "UNVERIFIED";
      };
      if (verdict.ok !== true) {
        if (verdict.reason === "UNVERIFIED") {
          setState({
            kind: "unverified",
            email: email.trim(),
            resending: false,
            resent: false,
            devLink: null,
            error: null,
          });
          return;
        }
        setState({
          kind: "invalid",
          message: "Invalid email or password.",
        });
        return;
      }

      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setState({
          kind: "invalid",
          message: "Invalid email or password.",
        });
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setState({
        kind: "invalid",
        message: "Something went wrong. Try again.",
      });
    }
  };

  const oauth = async (provider: "google" | "github") => {
    setState({ kind: "submitting" });
    await signIn(provider, { callbackUrl });
  };

  const onResend = async () => {
    if (state.kind !== "unverified") return;
    setState({ ...state, resending: true, error: null });
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        devActivationLink?: string | null;
      };
      if (!res.ok || !data.ok) {
        setState({
          ...state,
          resending: false,
          error: data.error ?? "Could not resend activation email.",
        });
        return;
      }
      setState({
        ...state,
        resending: false,
        resent: true,
        devLink: data.devActivationLink ?? null,
        error: null,
      });
    } catch {
      setState({
        ...state,
        resending: false,
        error: "Network error. Try again.",
      });
    }
  };

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
              Continue with Google
            </button>
          )}
          {githubEnabled && (
            <button
              type="button"
              disabled={pending}
              onClick={() => void oauth("github")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-900 disabled:opacity-50"
            >
              Continue with GitHub
            </button>
          )}
          <div className="relative py-2 text-center text-xs text-slate-500">
            <span className="bg-transparent px-2">or email</span>
          </div>
        </div>
      )}

      {!googleEnabled && !githubEnabled && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          OAuth is optional. Add{" "}
          <code className="rounded bg-black/30 px-1">GOOGLE_CLIENT_ID</code> /{" "}
          <code className="rounded bg-black/30 px-1">GITHUB_CLIENT_ID</code> (and
          secrets) to <code className="rounded bg-black/30 px-1">.env.local</code>{" "}
          to enable Google or GitHub sign-in.
        </p>
      )}

      <form onSubmit={onCredentials} className="space-y-4">
        <label className="block" htmlFor="signin-email">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Email
          </span>
          <input
            id="signin-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/40 focus:ring-2"
          />
        </label>
        <PasswordField
          id="signin-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            Forgot password?
          </Link>
        </div>

        {state.kind === "invalid" && (
          <p className="text-sm text-rose-300" role="alert">
            {state.message}
          </p>
        )}

        {state.kind === "unverified" && (
          <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
            <div className="flex items-start gap-2">
              <MailWarning className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
              <div className="space-y-1">
                <p className="font-semibold text-amber-50">
                  Activate your account to sign in
                </p>
                <p className="text-amber-100/85">
                  We sent a one-tap activation link to{" "}
                  <span className="font-mono text-amber-50">
                    {state.email}
                  </span>
                  . Click it, then come back here.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onResend()}
              disabled={state.resending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-300/20 disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {state.resending
                ? "Resending…"
                : state.resent
                ? "Resend again"
                : "Resend activation email"}
            </button>
            {state.resent && (
              <p className="text-amber-100/85">
                Fresh link dispatched — check your inbox.
              </p>
            )}
            {state.devLink && (
              <p className="break-all rounded bg-black/30 px-2 py-1 text-[10px] text-amber-100/90">
                Dev shortcut:{" "}
                <a
                  className="underline"
                  href={state.devLink}
                  rel="noreferrer"
                >
                  {state.devLink}
                </a>
              </p>
            )}
            {state.error && (
              <p className="text-rose-200">{state.error}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[#1E293B] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#24364d] disabled:opacity-50"
        >
          {state.kind === "submitting" ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        New here?{" "}
        <Link
          href="/auth/signup"
          className="font-semibold text-cyan-300 hover:text-cyan-200"
        >
          Create an account
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
