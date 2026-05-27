"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import VerifiedBadge from "@/src/components/vital/VerifiedBadge";
import { toTitleCase } from "@/src/components/vital/titleCase";

type VitalFlipCardProps = {
  title: string;
  backDefinition: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  verified?: boolean;
  verifiedSource?: string;
  flipDisabled?: boolean;
};

export default function VitalFlipCard({
  title,
  backDefinition,
  children,
  className = "",
  innerClassName = "",
  verified = false,
  verifiedSource = "Apple Health",
  flipDisabled = false,
}: VitalFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const displayTitle = toTitleCase(title);

  const faceBase =
    "flex flex-col rounded-3xl border border-white/50 bg-white/40 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-[12px]";

  return (
    <div className={`vital-flip-scene ${className}`} style={{ perspective: "1200px" }}>
      <div
        className={`vital-flip-inner relative w-full transition-transform duration-500 ease-in-out ${
          flipped && !flipDisabled ? "[transform:rotateY(180deg)]" : ""
        }`}
        style={{ transformStyle: "preserve-3d" } as CSSProperties}
      >
        <div
          className={`vital-flip-face ${faceBase} ${innerClassName}`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <button
            type="button"
            onClick={() => !flipDisabled && setFlipped(true)}
            className="mb-2 flex w-full shrink-0 items-center gap-2 text-left"
          >
            <h2 className="text-base font-bold text-slate-900">{displayTitle}</h2>
            {verified ? <VerifiedBadge sourceName={verifiedSource} /> : null}
            {!flipDisabled ? (
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Tap to learn
              </span>
            ) : null}
          </button>
          <div className="min-h-0 flex-1">{children}</div>
        </div>

        <div
          className={`vital-flip-face absolute inset-0 ${faceBase} ${innerClassName}`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <button
            type="button"
            onClick={() => setFlipped(false)}
            className="mb-3 flex w-full items-center gap-2 text-left"
          >
            <h2 className="text-base font-bold text-slate-900">{displayTitle}</h2>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-teal-700">
              Tap to return
            </span>
          </button>
          <p className="text-sm leading-relaxed text-slate-700">{backDefinition}</p>
        </div>
      </div>
    </div>
  );
}
