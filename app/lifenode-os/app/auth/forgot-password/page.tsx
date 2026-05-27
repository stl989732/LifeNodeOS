import AuthShell from "@/src/components/AuthShell";
import ForgotPasswordForm from "@/src/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot password · LifeNode OS",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recover your account"
      subtitle="Tell us the email on file and we'll guide you through resetting."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
