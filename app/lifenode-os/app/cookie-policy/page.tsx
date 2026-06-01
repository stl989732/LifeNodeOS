import LegalPageShell from "@/src/components/legal/LegalPageShell";
import TermlyPolicyEmbed from "@/src/components/legal/TermlyPolicyEmbed";
import { TERMLY_COOKIE_POLICY_ID } from "@/src/components/legal/termlyPolicyIds";

export const metadata = {
  title: "Cookie Policy | LifeNode OS",
  description: "How LifeNode OS uses cookies and similar technologies.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPageShell>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
        <TermlyPolicyEmbed
          policyId={TERMLY_COOKIE_POLICY_ID}
          className="min-h-[70vh] w-full"
        />
      </div>
    </LegalPageShell>
  );
}
