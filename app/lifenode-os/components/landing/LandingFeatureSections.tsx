"use client";

import { Activity, Clock, HeartPulse, Home, Layers, Moon, RefreshCw } from "lucide-react";

const FONT_PLAYFAIR = "font-[family-name:var(--font-playfair)]";

const LANDING_FEATURES = [
  {
    id: "household",
    headline: "Your entire home, quietly in sync.",
    subtext:
      "Consolidate shared family calendars, grocery lists, and school tracking into a single command deck. No more fragmented threads.",
    preview: "schedule" as const,
  },
  {
    id: "recovery",
    headline: "Prioritize the parents.",
    subtext:
      "Track your personal wellness, sleep data via Whoop/Apple Health, and physical recovery milestones alongside your daily family tasks.",
    preview: "vitals" as const,
    reverse: true,
  },
  {
    id: "workspace",
    headline: "Bridge work and life natively.",
    subtext:
      "Connect your professional stack like Slack, Gmail, and Notion. Let Lino triage the noise so you can focus on being present.",
    preview: "workspace" as const,
  },
];

function FeaturePreviewCard({ variant }: { variant: "schedule" | "vitals" | "workspace" }) {
  if (variant === "schedule") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
        <Home className="mb-4 h-8 w-8 text-amber-400/80" />
        <div className="space-y-2">
          {[72, 56, 88].map((w) => (
            <div
              key={w}
              className="h-2 rounded-full bg-slate-800"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-[#90A1B9]">Unified family timeline</p>
      </div>
    );
  }
  if (variant === "vitals") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md">
        <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
        <HeartPulse className="mb-4 h-8 w-8 text-emerald-400/80" />
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <Moon className="mb-2 h-4 w-4 text-indigo-400" />
            <p className="text-lg font-semibold text-slate-100">84%</p>
            <p className="text-[10px] uppercase tracking-wide text-[#90A1B9]">Sleep</p>
          </div>
          <div className="flex-1 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <Activity className="mb-2 h-4 w-4 text-teal-400" />
            <p className="text-lg font-semibold text-slate-100">HRV</p>
            <p className="text-[10px] uppercase tracking-wide text-[#90A1B9]">Recovery</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md">
      <div className="absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
      <Layers className="mb-4 h-8 w-8 text-blue-400/80" />
      <div className="space-y-2">
        {["Slack triage", "Gmail digest", "Notion sync"].map((label) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
          >
            <span className="text-xs text-[#90A1B9]">{label}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingFeatureSections() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-[3px] pb-20 md:pt-[3px] md:pb-20">
      <div className="space-y-24 md:space-y-32">
        {LANDING_FEATURES.map((feature) => (
          <section
            key={feature.id}
            className={`grid items-center gap-10 md:grid-cols-2 md:gap-16 ${
              feature.reverse ? "md:[direction:rtl]" : ""
            }`}
          >
            <div className={feature.reverse ? "md:[direction:ltr]" : ""}>
              <FeaturePreviewCard variant={feature.preview} />
            </div>
            <div className={feature.reverse ? "md:[direction:ltr]" : ""}>
              <p
                className={`mb-3 text-[10px] font-bold uppercase tracking-[0.28em] ${
                  feature.id === "recovery" ? "text-[#BFCFFF]" : "text-[#90A1B9]"
                }`}
              >
                {feature.id === "household"
                  ? "HomeNode"
                  : feature.id === "recovery"
                    ? "VitalNode"
                    : "BizNode + Lino"}
              </p>
              <h2
                className={`${FONT_PLAYFAIR} text-3xl font-semibold italic leading-tight text-slate-50 md:text-4xl`}
              >
                {feature.headline}
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-[#DFFFE7]">
                {feature.subtext}
              </p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
