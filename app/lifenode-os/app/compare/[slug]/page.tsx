import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPublicHeader from "@/components/landing/LandingPublicHeader";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";
import CompetitorComparisonView from "@/components/landing/CompetitorComparisonView";
import {
  COMPETITOR_SLUGS,
  getCompetitor,
  comparisonPageTitle,
} from "@/components/landing/competitorComparisonData";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return COMPETITOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) {
    return { title: "Comparison — LifeNode OS" };
  }
  return {
    title: `${comparisonPageTitle(competitor)} — LifeNode OS`,
    description: competitor.summary,
  };
}

export default async function CompareCompetitorPage({ params }: PageProps) {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) notFound();

  return (
    <main className="landing-dark-zone min-h-screen bg-gradient-to-b from-[#f8fafc] via-slate-900/95 to-[#0B0F17] text-slate-50">
      <LandingPublicHeader theme="dark" />
      <CompetitorComparisonView competitor={competitor} />
      <LandingSiteFooter variant="dark" />
    </main>
  );
}
