import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Pricing — LifeNode OS",
  description:
    "Core is free. Sync and Nexus unlock more Nodes, AI, and integrations. Compare LifeNode OS plans for multi-hat operators.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Pricing — LifeNode OS",
    description:
      "Core free · Sync $24/mo · Nexus $59/mo. Life orchestration plans for founders, parents, VAs, and traders.",
    url: `${SITE_URL}/pricing`,
    siteName: "LifeNode OS",
    type: "website",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
