import type { Metadata } from "next";
import Onboarding from "../components/Onboarding";
import { buildLandingJsonLd } from "@/lib/landing/landingJsonLd";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "LifeNode OS — Life orchestration app for app fragmentation",
  description:
    "Orchestrate Gmail, Slack, Notion, calendars, and health tools in one dashboard. LifeNode OS is a life OS for founders, parents, VAs, and traders tired of app fragmentation.",
  keywords: [
    "life orchestration app",
    "tool orchestration",
    "app fragmentation",
    "unified productivity dashboard",
    "life OS",
    "all-in-one dashboard",
    "Notion alternative",
    "Sunsama alternative",
    "connect Slack Gmail Notion",
    "multi-role productivity",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "LifeNode OS — Orchestrate your tools in one life OS",
    description:
      "Stop toggling between 15 apps. LifeNode OS unifies work, home, clients, and health into role-based Nodes with AI triage.",
    url: SITE_URL,
    siteName: "LifeNode OS",
    type: "website",
    images: [{ url: "/lifenode-os-logo.png", width: 512, height: 512, alt: "LifeNode OS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LifeNode OS — Life orchestration app",
    description:
      "One dashboard to orchestrate Gmail, Slack, Notion, and more — built for multi-hat operators.",
    images: ["/lifenode-os-logo.png"],
  },
};

export default function Home() {
  const jsonLd = buildLandingJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Onboarding />
    </>
  );
}
