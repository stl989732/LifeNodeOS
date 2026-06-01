import Link from "next/link";
import type { ReactNode } from "react";
import ConsentPreferencesLink from "@/src/components/legal/ConsentPreferencesLink";

type Props = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export default function LegalPageShell({
  children,
  backHref = "/",
  backLabel = "Back to app",
}: Props) {
  return (
    <div className="min-h-screen bg-[#0B0F19] font-sans text-slate-200 selection:bg-cyan-500/30 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={backHref}
          className="group mb-8 inline-flex items-center text-sm text-slate-400 transition-colors hover:text-white"
        >
          <span className="mr-2 transition-transform group-hover:-translate-x-1">
            ←
          </span>{" "}
          {backLabel}
        </Link>

        {children}

        <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
          <Link
            href="/terms"
            className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400"
          >
            Terms of Use
          </Link>
          <Link
            href="/privacy"
            className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400"
          >
            Privacy Policy
          </Link>
          <Link
            href="/cookie-policy"
            className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400"
          >
            Cookie Policy
          </Link>
          <ConsentPreferencesLink className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400" />
        </footer>
      </div>
    </div>
  );
}
