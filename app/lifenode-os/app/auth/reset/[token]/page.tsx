import AuthShell from "@/src/components/AuthShell";
import ResetPasswordForm from "@/src/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset password · LifeNode OS",
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthShell
      title="Answer to recover"
      subtitle="Pass your security challenge to set a fresh password."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
