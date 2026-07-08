"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  COMPETITOR_SLUGS,
  COMPETITORS,
  LIFENODE_PRICING_SUMMARY,
} from "./competitorComparisonData";
import { landingDarkText } from "./landingDarkTheme";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

export default function LandingComparisonSection() {
  return (
    <section
      id="comparison"
      className={`${FONT_OUTFIT} relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-4 md:px-6`}
      aria-labelledby="landing-comparison-heading"
    >
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.28em] text-[#17C4B3]">
        See Comparison
      </p>
      <h2
        id="landing-comparison-heading"
        className="mt-3 text-center text-3xl font-bold text-white md:text-4xl"
      >
        How LifeNode OS stacks up
      </h2>
      <p
        className={`mx-auto mt-4 max-w-2xl text-center text-sm md:text-base ${landingDarkText.subtitle}`}
      >
        Side-by-side pricing and features vs tools you may already use.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm">
        <div className="grid gap-px bg-slate-800/60 md:grid-cols-3">
          <div className="bg-slate-950/80 p-4 md:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#17C4B3]">
              LifeNode OS
            </p>
            <p className="mt-2 text-sm font-semibold text-white">Core (free)</p>
            <p className={`mt-1 text-xs ${landingDarkText.planFeatures}`}>
              {LIFENODE_PRICING_SUMMARY.free}
            </p>
            <p className="mt-3 text-sm font-semibold text-white">Sync</p>
            <p className={`mt-1 text-xs ${landingDarkText.planFeatures}`}>
              {LIFENODE_PRICING_SUMMARY.paid}
            </p>
            <p className="mt-3 text-sm font-semibold text-white">Nexus</p>
            <p className={`mt-1 text-xs ${landingDarkText.planFeatures}`}>
              {LIFENODE_PRICING_SUMMARY.top}
            </p>
          </div>
          <div className="bg-slate-950/60 p-4 md:col-span-2 md:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Quick highlights
            </p>
            <ul className={`mt-3 space-y-2 text-sm ${landingDarkText.planFeatures}`}>
              <li>• Six role Nodes — not one generic workspace</li>
              <li>• Core free: BizNode + VANode + HomeNode (ChefNode included)</li>
              <li>• OAuth integrations, EOD screen capture, Linos AI assistant</li>
              <li>• Upgrade for Vital, Trader, Pro Nodes and higher AI caps</li>
            </ul>
          </div>
        </div>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COMPETITOR_SLUGS.map((slug) => {
          const competitor = COMPETITORS[slug];
          return (
            <li key={slug}>
              <Link
                href={`/compare/${slug}`}
                className="group flex h-full flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 transition hover:border-[#17C4B3]/50 hover:bg-slate-950/80"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#17C4B3]">
                    Comparison
                  </p>
                  <p className="mt-2 text-base font-bold text-white group-hover:text-[#00ffc8]">
                    LifeNode OS vs {competitor.name}
                  </p>
                  <p className={`mt-2 text-xs leading-relaxed ${landingDarkText.subtitle}`}>
                    {competitor.tagline}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#17C4B3]">
                  View full table
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className={`mt-8 text-center text-xs ${landingDarkText.disclaimer}`}>
        Competitor pricing is sourced from public list prices and may change.
        LifeNode limits follow your active plan — see{" "}
        <Link href="/pricing" className="font-semibold text-[#17C4B3] hover:underline">
          Pricing
        </Link>
        .
      </p>
    </section>
  );
}
