import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/src/components/AuthShell";
import { SignUpForm } from "@/src/components/auth/SignUpForm";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Sign up · LifeNode OS",
  alternates: { canonical: `${SITE_URL}/auth/signup` },
};

export default function SignUpPage() {
  const googleEnabled =
    Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
  const githubEnabled =
    Boolean(process.env.GITHUB_CLIENT_ID?.trim()) &&
    Boolean(process.env.GITHUB_CLIENT_SECRET?.trim());

  return (
    <AuthShell
      title="Create your account"
      subtitle="Email and password, or connect Google / GitHub when configured."
    >
      <Suspense
        fallback={
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        }
      >
        <SignUpForm googleEnabled={googleEnabled} githubEnabled={githubEnabled} />
      </Suspense>
    </AuthShell>
  );
}
