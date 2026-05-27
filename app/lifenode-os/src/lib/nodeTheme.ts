import type { ActiveNode } from "@/src/context/LifeNodeContext";

/**
 * Per-Node visual identity. Every Node owns one signature accent color and a
 * heading typeface so chrome (chips, eyebrows, icons) reads as that Node
 * without dropping to grey-on-grey.
 *
 * - `*OnGlass` classes target the dark glassmorphic Lino Assistant bar.
 * - `*OnLight` classes target the white setup cards inside each Node screen.
 */
export type NodeTheme = {
  hex: string;
  iconOnGlass: string;
  chipActiveOnGlass: string;
  chipInactiveOnGlass: string;
  titleOnGlass: string;
  toneOnGlass: string;
  eyebrowOnLight: string;
  headingOnLight: string;
  headingFont: string;
  caretOnGlass: string;
};

export const NODE_THEME: Record<ActiveNode, NodeTheme> = {
  BizNode: {
    hex: "#2563EB",
    iconOnGlass: "text-blue-300",
    chipActiveOnGlass: "border-blue-300/55 bg-blue-500/25 text-blue-50",
    chipInactiveOnGlass: "border-blue-300/20 bg-blue-500/10 text-blue-100/80",
    titleOnGlass: "text-blue-100",
    toneOnGlass: "text-blue-200/80",
    eyebrowOnLight: "text-blue-600",
    headingOnLight: "text-[#1E293B]",
    headingFont: "font-outfit",
    caretOnGlass: "bg-blue-200",
  },
  HomeNode: {
    hex: "#84A59D",
    iconOnGlass: "text-emerald-200",
    chipActiveOnGlass: "border-emerald-300/55 bg-emerald-400/25 text-emerald-50",
    chipInactiveOnGlass: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100/80",
    titleOnGlass: "text-emerald-50",
    toneOnGlass: "text-emerald-200/80",
    eyebrowOnLight: "text-[#5C7E76]",
    headingOnLight: "text-[#3F5751]",
    headingFont: "font-outfit",
    caretOnGlass: "bg-emerald-200",
  },
  VANode: {
    hex: "#0D9488",
    iconOnGlass: "text-teal-300",
    chipActiveOnGlass: "border-teal-300/55 bg-teal-500/25 text-teal-50",
    chipInactiveOnGlass: "border-teal-300/20 bg-teal-500/10 text-teal-100/80",
    titleOnGlass: "text-teal-50",
    toneOnGlass: "text-teal-200/80",
    eyebrowOnLight: "text-teal-700",
    headingOnLight: "text-[#0D9488]",
    headingFont: "font-outfit",
    caretOnGlass: "bg-teal-200",
  },
  TraderNode: {
    hex: "#06B6D4",
    iconOnGlass: "text-cyan-300",
    chipActiveOnGlass: "border-cyan-300/55 bg-cyan-500/25 text-cyan-50",
    chipInactiveOnGlass: "border-cyan-300/20 bg-cyan-500/10 text-cyan-100/80",
    titleOnGlass: "text-cyan-50",
    toneOnGlass: "text-cyan-200/80",
    eyebrowOnLight: "text-cyan-600",
    headingOnLight: "text-[#06B6D4]",
    headingFont: "font-mono",
    caretOnGlass: "bg-cyan-200",
  },
  VitalNode: {
    hex: "#10B981",
    iconOnGlass: "text-emerald-300",
    chipActiveOnGlass: "border-emerald-400/55 bg-emerald-500/25 text-emerald-50",
    chipInactiveOnGlass: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100/80",
    titleOnGlass: "text-emerald-50",
    toneOnGlass: "text-emerald-200/80",
    eyebrowOnLight: "text-emerald-700",
    headingOnLight: "text-[#065F46]",
    headingFont: "font-outfit",
    caretOnGlass: "bg-emerald-200",
  },
  ProNode: {
    hex: "#6366F1",
    iconOnGlass: "text-indigo-300",
    chipActiveOnGlass: "border-indigo-300/55 bg-indigo-500/25 text-indigo-50",
    chipInactiveOnGlass: "border-indigo-300/20 bg-indigo-500/10 text-indigo-100/80",
    titleOnGlass: "text-indigo-50",
    toneOnGlass: "text-indigo-200/80",
    eyebrowOnLight: "text-indigo-600",
    headingOnLight: "text-[#1E293B]",
    headingFont: "font-playfair",
    caretOnGlass: "bg-indigo-200",
  },
};

export function getNodeTheme(node: ActiveNode | undefined | null): NodeTheme {
  if (node && NODE_THEME[node]) return NODE_THEME[node];
  return NODE_THEME.BizNode;
}
