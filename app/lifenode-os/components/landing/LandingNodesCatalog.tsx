"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ALL_PRODUCT_SURFACES,
  PRODUCT_NODES,
  SHELL_SURFACES,
  type ProductSurface,
} from "@/lib/product-catalog";
import { DOC_ROUTES } from "@/lib/docs/routes";

import { landingDarkText } from "./landingDarkTheme";

const FONT_PLAYFAIR = "font-[family-name:var(--font-playfair)]";
const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";
const MOBILE_FEATURE_LIMIT = 5;

function CatalogCard({ surface }: { surface: ProductSurface }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = surface.features.length > MOBILE_FEATURE_LIMIT;
  const visibleFeatures =
    expanded || !hasMore
      ? surface.features
      : surface.features.slice(0, MOBILE_FEATURE_LIMIT);

  return (
    <article
      className="flex h-full flex-col rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 backdrop-blur-sm transition-colors hover:border-slate-700"
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

function CatalogGrid({
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
        <p className="mt-2 max-w-2xl text-sm text-[#515A67]">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {surfaces.map((surface) => (
          <CatalogCard key={surface.id} surface={surface} />
        ))}
      </div>
    </div>
  );
}

export default function LandingNodesCatalog() {
  return (
    <div className={`${FONT_OUTFIT} mx-auto w-full max-w-6xl px-4 pb-24 pt-8 md:pb-32`}>
      <div className="mb-14 text-center md:mb-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#677589]">
          Full catalog
        </p>
        <h2
          className={`${FONT_PLAYFAIR} mt-3 text-3xl font-semibold italic leading-tight text-slate-50 md:text-4xl`}
        >
          All Nodes &amp; Features
        </h2>
        <p className={`mx-auto mt-4 max-w-2xl text-base leading-relaxed ${landingDarkText.featureBody}`}>
          One shell for calendar, inbox, and LifePulse — plus six domain nodes you
          enable as hats. Every surface below is available when you sign in.
        </p>
      </div>

      <div className="space-y-20">
        <CatalogGrid
          title="Shell surfaces"
          subtitle="Shared across every enabled node — sidebar, overlays, and global tools."
          surfaces={SHELL_SURFACES}
        />
        <CatalogGrid
          title="Domain nodes"
          subtitle="Pick the hats that match your life; each node has its own dashboard and feature menu."
          surfaces={PRODUCT_NODES}
        />
      </div>

      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <p className="max-w-lg text-sm text-[#90A1B9]">
          {ALL_PRODUCT_SURFACES.length} surfaces documented — from Unified Inbox to
          TraderNode risk guardrails.
        </p>
        <Link
          href={DOC_ROUTES.hub}
          className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-6 py-3 text-sm font-semibold text-teal-300 transition hover:border-teal-400/60 hover:bg-teal-500/20"
        >
          Read the full user guide
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
