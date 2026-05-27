import { Suspense } from "react";
import AuthShell from "@/src/components/AuthShell";
import { SignInForm } from "@/src/components/auth/SignInForm";

export const metadata = {
  title: "Sign in · LifeNode OS",
};

export default function SignInPage() {
  const googleEnabled =
    Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
  const githubEnabled =
    Boolean(process.env.GITHUB_CLIENT_ID?.trim()) &&
    Boolean(process.env.GITHUB_CLIENT_SECRET?.trim());

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to configure your Nodes and open the Unified Hub."
    >
      <Suspense
        fallback={
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        }
      >
        <SignInForm googleEnabled={googleEnabled} githubEnabled={githubEnabled} />
      </Suspense>
    </AuthShell>
  );
}
