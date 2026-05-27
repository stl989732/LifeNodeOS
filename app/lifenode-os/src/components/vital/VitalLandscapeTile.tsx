"use client";

import { useState, type CSSProperties } from "react";
import VerifiedBadge from "@/src/components/vital/VerifiedBadge";
import { toTitleCase } from "@/src/components/vital/titleCase";

type VitalLandscapeTileProps = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  backDefinition: string;
  verified?: boolean;
  verifiedSource?: string;
  onChange: (n: number) => void;
};

export default function VitalLandscapeTile({
  label,
  value,
  unit,
  min,
  max,
  backDefinition,
  verified = false,
  verifiedSource = "Apple Health",
  onChange,
}: VitalLandscapeTileProps) {
  const [flipped, setFlipped] = useState(false);
  const displayLabel = toTitleCase(label);

  return (
    <div className="vital-flip-scene h-full min-h-[120px]" style={{ perspective: "900px" }}>
      <div
        className={`vital-flip-inner relative h-full w-full transition-transform duration-500 ease-in-out ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
        style={{ transformStyle: "preserve-3d" } as CSSProperties}
      >
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="vital-flip-face flex h-full w-full flex-col rounded-2xl border border-white/55 bg-white/45 p-3 text-left shadow-sm"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {displayLabel}
            {verified ? <VerifiedBadge sourceName={verifiedSource} className="scale-90" /> : null}
          </span>
          <span className="text-xl font-bold text-slate-900">
            {value}
            {unit}
          </span>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              e.stopPropagation();
              onChange(Number(e.target.value) || min);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 w-full accent-teal-600"
          />
          <span className="mt-1 text-[9px] font-semibold uppercase text-slate-400">Tap for definition</span>
        </button>

        <button
          type="button"
          onClick={() => setFlipped(false)}
          className="vital-flip-face absolute inset-0 flex h-full w-full flex-col justify-center rounded-2xl border border-white/55 bg-white/55 p-3 text-left shadow-sm"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="mb-1 text-xs font-bold text-slate-900">{displayLabel}</span>
          <p className="text-[11px] leading-relaxed text-slate-600">{backDefinition}</p>
          <span className="mt-2 text-[9px] font-semibold uppercase text-teal-700">Tap to return</span>
        </button>
      </div>
    </div>
  );
}
