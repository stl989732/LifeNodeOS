"use client";

import { BadgeCheck } from "lucide-react";

export default function VerifiedBadge({
  sourceName,
  className = "",
}: {
  sourceName: string;
  className?: string;
}) {
  return (
    <span
      className={`group relative inline-flex shrink-0 ${className}`}
      title={`Live data synced from ${sourceName}`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/60 bg-white/50 shadow-sm backdrop-blur-sm">
        <BadgeCheck className="h-3.5 w-3.5 text-teal-600" strokeWidth={2.25} />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-white/50 bg-slate-900/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block"
      >
        Live data synced from {sourceName}
      </span>
    </span>
  );
}
