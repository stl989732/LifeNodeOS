"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

type Props = {
  className?: string;
  linkClassName?: string;
};

/** Quick links back to the Unified Hub and core nodes for signed-in users on marketing/legal pages. */
export default function DashboardReturnNav({
  className = "",
  linkClassName = "text-slate-600 transition hover:text-slate-900",
}: Props) {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <nav
      className={`flex flex-wrap items-center gap-3 text-sm font-semibold ${className}`}
    >
      <Link href="/shell" className={linkClassName}>
        Dashboard
      </Link>
      <Link href="/vanode" className={linkClassName}>
        VANode
      </Link>
      <Link href="/work" className={linkClassName}>
        BizNode
      </Link>
      <Link href="/home" className={linkClassName}>
        HomeNode
      </Link>
    </nav>
  );
}
