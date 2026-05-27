"use client";

import { useId } from "react";
import { AURA_GLASS_CLASS, AURA_GLASS_STYLE, AURA_TEXT } from "./lifePulseAura";

type CalmWheelProps = {
  percent: number;
  size?: "sm" | "md";
  showLabel?: boolean;
};

export default function CalmWheel({
  percent,
  size = "md",
  showLabel = true,
}: CalmWheelProps) {
  const gradId = useId().replace(/:/g, "");
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const isSm = size === "sm";
  const svgSize = isSm ? 56 : 112;
  const r = isSm ? 22 : 44;
  const stroke = isSm ? 5 : 10;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const cx = svgSize / 2;

  const ring = (
    <svg
      width={svgSize}
      height={svgSize}
      className="-rotate-90 drop-shadow-sm"
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700"
      />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B7C99" />
          <stop offset="100%" stopColor="#9B7EAD" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (!showLabel) {
    return (
      <div className="relative shrink-0" title={`${clamped}% Calm State`}>
        {ring}
        <span
          className={`absolute inset-0 flex items-center justify-center font-bold text-slate-800 ${
            isSm ? "text-[10px]" : "text-lg"
          }`}
        >
          {clamped}%
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${AURA_GLASS_CLASS}`}
      style={AURA_GLASS_STYLE}
    >
      {ring}
      <p className={`font-bold ${AURA_TEXT.title} ${isSm ? "text-sm" : "text-2xl"}`}>
        {clamped}%
      </p>
      {showLabel ? (
        <p className={`font-semibold uppercase tracking-widest ${AURA_TEXT.label} ${isSm ? "text-[9px]" : "text-[11px]"}`}>
          Calm State
        </p>
      ) : null}
    </div>
  );
}
