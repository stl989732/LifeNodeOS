"use client";

import ReactMarkdown from "react-markdown";
import { AURA_TEXT } from "./lifePulseAura";

type Props = {
  description: string;
  className?: string;
};

export default function TrackerPlanBody({ description, className = "" }: Props) {
  return (
    <div
      className={`rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm leading-relaxed text-slate-800 backdrop-blur-sm ${className}`}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className={`mb-2 last:mb-0 ${AURA_TEXT.body}`}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1.5 pl-4 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1.5 pl-4 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="text-slate-800">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
        }}
      >
        {description}
      </ReactMarkdown>
    </div>
  );
}

export function formatPlannedTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
