import { Suspense } from "react";
import AuthShell from "@/src/components/AuthShell";
import VerifyEmailStatus from "@/src/components/auth/VerifyEmailStatus";

export const metadata = {
  title: "Activate your account · LifeNode OS",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Activate your account"
      subtitle="Your LifeNode OS account is one tap away."
    >
      <Suspense
        fallback={
          <p className="py-8 text-center text-sm text-slate-400">Checking…</p>
        }
      >
        <VerifyEmailStatus />
      </Suspense>
    </AuthShell>
  );
}
