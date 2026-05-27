"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete?: "current-password" | "new-password";
  minLength?: number;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
};

/**
 * Email/password input with an inline show/hide toggle. The toggle is a
 * proper `button[type="button"]` so it never submits the parent form. The
 * pressed state mirrors AAA accessibility (aria-pressed + aria-label).
 */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  minLength,
  required = true,
  placeholder,
  helperText,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="relative">
        <input
          id={id}
          type={revealed ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 pr-12 text-sm text-slate-100 outline-none ring-cyan-400/40 focus:ring-2"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-pressed={revealed}
          aria-label={revealed ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-2 inline-flex h-full items-center justify-center px-2 text-slate-400 transition hover:text-slate-200 focus:outline-none focus-visible:text-slate-100"
        >
          {revealed ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {helperText ? (
        <span className="mt-1.5 block text-[11px] text-slate-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
