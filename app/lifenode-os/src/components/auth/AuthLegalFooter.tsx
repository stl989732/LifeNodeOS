import Link from "next/link";
import ConsentPreferencesLink from "@/src/components/legal/ConsentPreferencesLink";

export default function AuthLegalFooter() {
  return (
    <div className="mt-8 border-t border-slate-800/60 pt-6 text-center">
      <p className="text-xs tracking-wide text-slate-500">
        By continuing, you agree to LifeNode OS&apos;s{" "}
        <Link
          href="/terms"
          className="text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400"
        >
          Terms of Use
        </Link>
        ,{" "}
        <Link
          href="/privacy"
          className="text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400"
        >
          Privacy Policy
        </Link>
        , and{" "}
        <Link
          href="/cookie-policy"
          className="text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400"
        >
          Cookie Policy
        </Link>
        .
      </p>
      <p className="mt-3 text-xs text-slate-500">
        <ConsentPreferencesLink className="text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400" />
      </p>
    </div>
  );
}
