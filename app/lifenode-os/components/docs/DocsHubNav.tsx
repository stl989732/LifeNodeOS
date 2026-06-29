"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAV_ITEMS } from "@/lib/docs/routes";

export default function DocsHubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Documentation"
      className="mb-10 flex flex-wrap gap-2 border-b border-slate-800 pb-6"
    >
      {DOC_NAV_ITEMS.map((item) => {
        const active =
          item.href === "/docs"
            ? pathname === "/docs"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
