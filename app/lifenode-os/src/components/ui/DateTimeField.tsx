"use client";

import { useRef } from "react";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  required?: boolean;
  /** When true, only show a date picker (no time). */
  dateOnly?: boolean;
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
  "w-full rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 text-sm text-[#1E293B] outline-none transition-shadow focus:border-[#84A59D]/50 focus:ring-2 focus:ring-[#84A59D]/20 cursor-pointer [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer";

export default function DateTimeField({
  label,
  value,
  onChange,
  disabled,
  className = "",
  labelClassName = "",
  inputClassName = "",
  required,
  dateOnly = false,
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
            onChange={(e) =>
              onChange(
                dateOnly ? e.target.value : combineValue(e.target.value, time),
              )
            }
            onClick={() => openPicker(dateRef.current)}
            disabled={disabled}
            required={required}
            className={`${fieldClass} ${inputClassName}`}
          />
        </div>
        {!dateOnly ? (
        <div className="relative min-w-[7rem] flex-1">
          <input
            ref={timeRef}
            type="time"
            value={time}
            onChange={(e) => onChange(combineValue(date, e.target.value))}
            onClick={() => openPicker(timeRef.current)}
            disabled={disabled || !date}
            required={required && Boolean(date)}
            className={`${fieldClass} ${inputClassName}`}
          />
        </div>
        ) : null}
      </div>
    </div>
  );
}
