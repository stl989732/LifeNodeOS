"use client";

import { useState } from "react";
import type { ProductSurface } from "@/lib/product-catalog";

const MOBILE_FEATURE_LIMIT = 5;
const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

export function CatalogCard({ surface }: { surface: ProductSurface }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = surface.features.length > MOBILE_FEATURE_LIMIT;
  const visibleFeatures =
    expanded || !hasMore
      ? surface.features
      : surface.features.slice(0, MOBILE_FEATURE_LIMIT);

  return (
    <article
      className={`${FONT_OUTFIT} flex h-full flex-col rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 backdrop-blur-sm transition-colors hover:border-slate-700`}
      style={{ borderTopColor: surface.color, borderTopWidth: 3 }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-50">{surface.label}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#90A1B9]">{surface.blurb}</p>
        </div>
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: surface.color ?? "#64748B" }}
          aria-hidden
        />
      </div>

      <ul className="mt-auto space-y-2 border-t border-slate-800/60 pt-4">
        {visibleFeatures.map((feature) => (
          <li key={feature.id} className="text-sm text-slate-300">
            <span className="font-medium text-slate-200">{feature.label}</span>
            {feature.description ? (
              <span className="mt-0.5 block text-xs leading-relaxed text-[#90A1B9]">
                {feature.description}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-left text-xs font-semibold text-teal-400 transition hover:text-teal-300 md:hidden"
        >
          {expanded
            ? "Show fewer"
            : `Show all ${surface.features.length} features`}
        </button>
      ) : null}
    </article>
  );
}

export function CatalogGrid({
  title,
  subtitle,
  surfaces,
}: {
  title: string;
  subtitle: string;
  surfaces: ProductSurface[];
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#677589]">
          {title}
        </p>
        <p className={`${FONT_OUTFIT} mt-2 max-w-2xl text-sm text-[#515A67]`}>{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {surfaces.map((surface) => (
          <CatalogCard key={surface.id} surface={surface} />
        ))}
      </div>
    </div>
  );
}
