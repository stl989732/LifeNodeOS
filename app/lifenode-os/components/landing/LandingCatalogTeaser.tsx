"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ALL_PRODUCT_SURFACES } from "@/lib/product-catalog";

const FONT_PLAYFAIR = "font-[family-name:var(--font-playfair)]";

export default function LandingCatalogTeaser() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 md:pb-32">
      <div className="text-center md:mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#677589]">
          Full catalog
        </p>
        <h2
          className={`${FONT_PLAYFAIR} mt-3 text-3xl font-semibold italic leading-tight text-slate-50 md:text-4xl`}
        >
          All Nodes &amp; Features
        </h2>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="max-w-lg text-sm text-[#90A1B9]">
          {ALL_PRODUCT_SURFACES.length} surfaces documented — from Unified Inbox to
          TraderNode risk guardrails.
        </p>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-6 py-3 text-sm font-semibold text-teal-300 transition hover:border-teal-400/60 hover:bg-teal-500/20"
        >
          Read the full user guide
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
