"use client";

import { CalendarClock } from "lucide-react";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  required?: boolean;
};

export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(local: string): string | null {
  if (!local?.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function DateTimeField({
  label,
  value,
  onChange,
  disabled,
  className = "",
  labelClassName = "",
  inputClassName = "",
  required,
}: Props) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      {label ? (
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.18em] text-[#90A1B9] ${labelClassName}`}
        >
          {label}
        </span>
      ) : null}
      <div className="relative">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={`w-full rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 pr-9 text-sm text-[#1E293B] outline-none transition-shadow focus:border-[#84A59D]/50 focus:ring-2 focus:ring-[#84A59D]/20 ${inputClassName}`}
        />
        <CalendarClock
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90A1B9]"
          aria-hidden
        />
      </div>
    </label>
  );
}
