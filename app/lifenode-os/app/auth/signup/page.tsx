import { Suspense } from "react";
import AuthShell from "@/src/components/AuthShell";
import { SignUpForm } from "@/src/components/auth/SignUpForm";

export const metadata = {
  title: "Sign up · LifeNode OS",
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
