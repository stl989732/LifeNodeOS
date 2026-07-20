import type { Metadata } from "next";
import LandingPublicHeader from "@/components/landing/LandingPublicHeader";
import LandingComparisonSection from "@/components/landing/LandingComparisonSection";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Compare — LifeNode OS",
  description:
    "Side-by-side pricing and features: LifeNode OS vs Notion, Motion, Sunsama, Akiflow, ClickUp, HoneyBook, and Dubsado — life orchestration vs app fragmentation.",
  alternates: { canonical: `${SITE_URL}/compare` },
};

export default function CompareHubPage() {
  return (
    <main className="landing-dark-zone min-h-screen bg-gradient-to-b from-[#f8fafc] via-slate-900/95 to-[#0B0F17] text-slate-50">
      <LandingPublicHeader theme="dark" />
      <LandingComparisonSection />
      <LandingSiteFooter variant="dark" />
    </main>
  );
}
