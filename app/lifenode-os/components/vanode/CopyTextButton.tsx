"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  text: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
  disabled?: boolean;
};

export function CopyTextButton({
  text,
  label = "Copy",
  iconOnly = false,
  className = "",
  disabled,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={disabled || !text.trim()}
      title={copied ? "Copied" : label}
      aria-label={copied ? "Copied" : label}
      className={
        iconOnly
          ? `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${className}`
          : `inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${className}`
      }
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {iconOnly ? null : copied ? "Copied" : label}
    </button>
  );
}
