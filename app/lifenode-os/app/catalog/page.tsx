"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ALL_PRODUCT_SURFACES,
  PRODUCT_NODES,
  SHELL_SURFACES,
} from "@/lib/product-catalog";
import { CatalogGrid } from "@/components/landing/ProductCatalogGrids";
import LandingPublicHeader from "@/components/landing/LandingPublicHeader";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";
import { DOC_ROUTES } from "@/lib/docs/routes";

const FONT_PLAYFAIR = "font-[family-name:var(--font-playfair)]";
const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

export default function CatalogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-slate-900/95 to-[#0B0F17] text-slate-50">
      <LandingPublicHeader theme="dark" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-2 md:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mb-14 text-center md:mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-teal-400/90">
            Full catalog
          </p>
          <h1
            className={`${FONT_PLAYFAIR} mt-3 text-3xl font-semibold italic leading-tight text-white md:text-4xl`}
          >
            Shell surfaces &amp; domain nodes
          </h1>
          <p className={`${FONT_OUTFIT} mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400`}>
            Browse every LifeNode OS surface — shared shell tools and the six hats
            you enable. {ALL_PRODUCT_SURFACES.length} surfaces from Unified Inbox
            to TraderNode risk guardrails.
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

        <div className="mt-16 text-center">
          <Link
            href={DOC_ROUTES.guide}
            className={`${FONT_OUTFIT} inline-flex items-center gap-2 text-sm font-semibold text-teal-400 transition hover:text-teal-300`}
          >
            Read the full user guide →
          </Link>
        </div>
      </div>

      <LandingSiteFooter variant="dark" />
    </main>
  );
}
