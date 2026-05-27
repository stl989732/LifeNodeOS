import type { CSSProperties } from "react";

/** Aura Glass — AI-Enhanced Planner palette (lninstructions.md) */

export const AURA_SUNRISE_BG = "min-h-screen aura-planner-bg";

export const AURA_GLASS_STYLE: CSSProperties = {
  background: "rgba(255, 255, 255, 0.42)",
  backdropFilter: "blur(16px) saturate(120%)",
  WebkitBackdropFilter: "blur(16px) saturate(120%)",
  border: "1px solid rgba(255, 255, 255, 0.55)",
};

export const AURA_CONTEXT_CARD_STYLE: CSSProperties = {
  background: "rgba(255, 255, 255, 0.52)",
  backdropFilter: "blur(14px) saturate(115%)",
  WebkitBackdropFilter: "blur(14px) saturate(115%)",
  border: "1px solid rgba(255, 255, 255, 0.65)",
};

/** Tailwind helper — pairs with AURA_GLASS_STYLE via style prop */
export const AURA_GLASS_CLASS = "rounded-3xl shadow-[0_8px_32px_rgba(90,110,130,0.12)]";

export const AURA_TEXT = {
  title: "text-slate-900",
  body: "text-slate-700",
  muted: "text-slate-600",
  label: "text-slate-500",
  accent: "text-slate-800",
  link: "text-slate-800 font-semibold underline decoration-slate-400/60 underline-offset-2 hover:decoration-slate-700",
};

export const AURA_INPUT_CLASS =
  "rounded-xl border border-white/20 bg-white/30 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none backdrop-blur-sm focus:border-white/40 focus:ring-2 focus:ring-white/30";

export const AURA_BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-slate-900/90 px-5 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-slate-800 disabled:opacity-40";

export const AURA_CATEGORY_ACTIVE =
  "border-white/30 bg-white/25 text-slate-900 shadow-[0_4px_20px_rgba(255,255,255,0.25)]";

export const AURA_CATEGORY_IDLE =
  "border-white/15 bg-white/10 text-slate-700 hover:border-white/25 hover:bg-white/15";
