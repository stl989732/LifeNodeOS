"use client";

import { useRef } from "react";
import { Calendar, Clock } from "lucide-react";

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

function splitValue(value: string): { date: string; time: string } {
  if (!value?.trim()) return { date: "", time: "" };
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

function combineValue(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "09:00"}`;
}

function openPicker(input: HTMLInputElement | null) {
  if (!input) return;
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      /* fall through */
    }
  }
  input.focus();
  input.click();
}

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 text-sm text-[#1E293B] outline-none transition-shadow focus:border-[#84A59D]/50 focus:ring-2 focus:ring-[#84A59D]/20 cursor-pointer";

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
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const { date, time } = splitValue(value);

  return (
    <div className={`block space-y-1.5 ${className}`}>
      {label ? (
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.18em] text-[#90A1B9] ${labelClassName}`}
        >
          {label}
        </span>
      ) : null}
      <div className="flex min-w-[11rem] flex-col gap-1.5 sm:flex-row">
        <div className="relative min-w-[8.5rem] flex-1">
          <input
            ref={dateRef}
            type="date"
            value={date}
            onChange={(e) => onChange(combineValue(e.target.value, time))}
            onClick={() => openPicker(dateRef.current)}
            disabled={disabled}
            required={required}
            className={`${fieldClass} pr-9 ${inputClassName}`}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => openPicker(dateRef.current)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#90A1B9] hover:bg-slate-100 disabled:opacity-40"
            aria-label="Open calendar"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
        <div className="relative min-w-[7rem] flex-1">
          <input
            ref={timeRef}
            type="time"
            value={time}
            onChange={(e) => onChange(combineValue(date, e.target.value))}
            onClick={() => openPicker(timeRef.current)}
            disabled={disabled || !date}
            required={required && Boolean(date)}
            className={`${fieldClass} pr-9 ${inputClassName}`}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || !date}
            onClick={() => openPicker(timeRef.current)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#90A1B9] hover:bg-slate-100 disabled:opacity-40"
            aria-label="Open time picker"
          >
            <Clock className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
