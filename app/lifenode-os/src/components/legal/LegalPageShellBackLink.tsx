"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

type Props = {
  backHref?: string;
  backLabel?: string;
};

export default function LegalPageShellBackLink({
  backHref = "/",
  backLabel = "Back to app",
}: Props) {
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);

  return (
    <div className="mb-8 flex flex-wrap items-center gap-4">
      <Link
        href={signedIn ? "/shell" : backHref}
        className="group inline-flex items-center text-sm text-slate-400 transition-colors hover:text-white"
      >
        <span className="mr-2 transition-transform group-hover:-translate-x-1">
          ←
        </span>
        {signedIn ? "Back to dashboard" : backLabel}
      </Link>
      {signedIn ? (
        <nav className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
          <Link href="/vanode" className="transition hover:text-cyan-400">
            VANode
          </Link>
          <Link href="/work" className="transition hover:text-cyan-400">
            BizNode
          </Link>
          <Link href="/home" className="transition hover:text-cyan-400">
            HomeNode
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
