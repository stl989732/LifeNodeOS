"use client";

/**
 * Playful loading state for ChefNode / Kitchen — spoon, fork, knife “clash” cycle.
 */
export default function ChefUtensilLoader({
  message = "ChefNode is preparing your kitchen…",
  compact = false,
  subMessage,
}) {
  const hint =
    subMessage ??
    (compact ? "Hang tight — large images can take a moment." : "Recipe details follow once the model finishes.");
  const emojiRow = compact ? "gap-3 text-3xl" : "gap-4 text-5xl";
  return (
    <div className="chef-utensil-loader flex flex-col items-center gap-4 py-2">
      <style>{`
        @keyframes chef-utensil-clash {
          0%, 100% { transform: translateX(0) rotate(0deg) scale(1); }
          20% { transform: translateX(-10px) rotate(-14deg) scale(1.05); }
          40% { transform: translateX(10px) rotate(14deg) scale(1.05); }
          60% { transform: translateX(-6px) rotate(-8deg) scale(1); }
          80% { transform: translateX(6px) rotate(8deg) scale(1); }
        }
        @keyframes chef-utensil-fade {
          0%, 100% { opacity: 0.35; filter: grayscale(0.2); }
          50% { opacity: 1; filter: grayscale(0); }
        }
        .chef-utensil-loader .u1 { animation: chef-utensil-clash 1.1s ease-in-out infinite; }
        .chef-utensil-loader .u2 { animation: chef-utensil-clash 1.1s ease-in-out infinite 0.12s; }
        .chef-utensil-loader .u3 { animation: chef-utensil-clash 1.1s ease-in-out infinite 0.24s; }
        .chef-utensil-loader .u-wrap { animation: chef-utensil-fade 1.4s ease-in-out infinite; }
      `}</style>
      <div
        className={`u-wrap flex items-center justify-center leading-none select-none ${emojiRow}`}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <span className="u1 inline-block" aria-hidden>
          🥄
        </span>
        <span className="u2 inline-block" aria-hidden>
          🍴
        </span>
        <span className="u3 inline-block" aria-hidden>
          🔪
        </span>
      </div>
      <p className="max-w-xs text-center text-sm font-semibold tracking-tight text-slate-900">{message}</p>
      <p className="max-w-xs text-center text-xs text-slate-600">{hint}</p>
    </div>
  );
}
