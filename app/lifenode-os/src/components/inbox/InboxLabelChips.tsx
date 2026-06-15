"use client";

type Props = {
  labels: string[];
  className?: string;
  compact?: boolean;
};

const HIDDEN_LABELS = new Set(["UNREAD", "CATEGORY_PERSONAL"]);

export default function InboxLabelChips({
  labels,
  className = "",
  compact = false,
}: Props) {
  const visible = labels.filter(
    (l) => l && !HIDDEN_LABELS.has(l.toUpperCase()) && !l.startsWith("CATEGORY_"),
  );

  if (visible.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "" : "gap-1.5"} ${className}`}>
      {visible.map((label) => (
        <span
          key={label}
          className={`rounded-md bg-slate-100 font-medium text-slate-600 ${
            compact
              ? "px-1.5 py-0.5 text-[9px] leading-tight"
              : "px-2 py-0.5 text-[11px]"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function readLabelNames(providerPayload: Record<string, unknown>): string[] {
  const raw = providerPayload.labelNames;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}
