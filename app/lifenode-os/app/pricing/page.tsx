"use client";

import PricingPlansSection from "@/src/components/billing/PricingPlansSection";
import LandingFeatureSections from "@/components/landing/LandingFeatureSections";
import LandingNodesCatalog from "@/components/landing/LandingNodesCatalog";
import LandingPublicHeader from "@/components/landing/LandingPublicHeader";
import LandingComparisonSection from "@/components/landing/LandingComparisonSection";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";

export default function PricingPage() {
  return (
    <main className="landing-dark-zone min-h-screen bg-gradient-to-b from-[#f8fafc] via-slate-900/95 to-[#0B0F17] text-slate-50">
      <LandingPublicHeader theme="dark" />
      <div className="mx-auto max-w-5xl px-4 pb-8 pt-4">
        <PricingPlansSection variant="dark" />
      </div>

      <LandingComparisonSection />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4">
        <LandingFeatureSections />
        <LandingNodesCatalog />
      </section>

      <LandingSiteFooter variant="dark" />
    </main>
  );
}
