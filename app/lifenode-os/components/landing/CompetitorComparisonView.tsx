"use client";

import Link from "next/link";
import type { CompetitorProfile } from "./competitorComparisonData";
import {
  COMPETITOR_SLUGS,
  COMPETITORS,
  LIFENODE_PRICING_SUMMARY,
  comparisonPageTitle,
} from "./competitorComparisonData";
import { landingDarkText } from "./landingDarkTheme";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

type Props = {
  competitor: CompetitorProfile;
};

export default function CompetitorComparisonView({ competitor }: Props) {
  const title = comparisonPageTitle(competitor);

  const categories = [...new Set(competitor.rows.map((row) => row.category))];

  return (
    <div className={`${FONT_OUTFIT} mx-auto max-w-5xl px-4 pb-16 pt-8 md:px-6`}>
      <nav className="mb-6 text-sm text-slate-400">
        <Link href="/" className="hover:text-[#17C4B3]">
          Home
        </Link>
        <span className="mx-2 text-slate-600">/</span>
        <Link href="/#comparison" className="hover:text-[#17C4B3]">
          See Comparison
        </Link>
        <span className="mx-2 text-slate-600">/</span>
        <span className={landingDarkText.comparisonBreadcrumbCurrent}>
          {competitor.name}
        </span>
      </nav>

      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#17C4B3]">
        See Comparison
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">{title}</h1>
      <p
        className={`mt-4 max-w-3xl text-sm leading-relaxed md:text-base ${landingDarkText.comparisonSummary}`}
      >
        {competitor.summary}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#17C4B3]/30 bg-slate-950/60 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#17C4B3]">
            LifeNode OS
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-white">Free</dt>
              <dd className={`mt-0.5 ${landingDarkText.planFeatures}`}>
                {LIFENODE_PRICING_SUMMARY.free}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Paid</dt>
              <dd className={`mt-0.5 ${landingDarkText.planFeatures}`}>
                {LIFENODE_PRICING_SUMMARY.paid}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Top tier</dt>
              <dd className={`mt-0.5 ${landingDarkText.planFeatures}`}>
                {LIFENODE_PRICING_SUMMARY.top}
              </dd>
            </div>
          </dl>
          <Link
            href="/pricing"
            className="mt-5 inline-flex rounded-full bg-[#17C4B3] px-4 py-2 text-xs font-bold text-slate-950 hover:bg-[#00ffc8]"
          >
            View LifeNode plans
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5">
          <p
            className={`text-[10px] font-bold uppercase tracking-wide ${landingDarkText.comparisonCompetitorLabel}`}
          >
            {competitor.name}
          </p>
          <p className={`mt-2 text-sm italic ${landingDarkText.comparisonSummary}`}>
            {competitor.tagline}
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-white">Free</dt>
              <dd className={`mt-0.5 ${landingDarkText.planFeatures}`}>
                {competitor.pricing.free}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Paid</dt>
              <dd className={`mt-0.5 ${landingDarkText.planFeatures}`}>
                {competitor.pricing.paid}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Top tier</dt>
              <dd className={`mt-0.5 ${landingDarkText.planFeatures}`}>
                {competitor.pricing.top}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {categories.map((category) => {
        const rows = competitor.rows.filter((row) => row.category === category);
        return (
          <div key={category} className="mt-12">
            <h2 className="text-lg font-bold text-white md:text-xl">{category}</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800/80">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/80">
                    <th className="px-4 py-3 font-bold text-slate-400">Feature</th>
                    <th className="px-4 py-3 font-bold text-[#17C4B3]">LifeNode OS</th>
                    <th className="px-4 py-3 font-bold text-slate-400">
                      {competitor.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.category}-${row.feature}`}
                      className="border-b border-slate-800/50 last:border-0"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {row.feature}
                      </td>
                      <td className={`px-4 py-3 ${landingDarkText.planFeatures}`}>
                        {row.lifenode}
                      </td>
                      <td className={`px-4 py-3 ${landingDarkText.comparisonSummary}`}>
                        {row.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="mt-12 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5">
        <p className="text-sm font-bold text-white">Compare with another tool</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {COMPETITOR_SLUGS.filter((slug) => slug !== competitor.slug).map((slug) => (
            <li key={slug}>
              <Link
                href={`/compare/${slug}`}
                className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#17C4B3]/50 hover:text-[#00ffc8]"
              >
                vs {COMPETITORS[slug].name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
