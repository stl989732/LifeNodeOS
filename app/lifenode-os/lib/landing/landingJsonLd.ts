import { LANDING_FAQ_ITEMS } from "@/components/landing/landingFaqData";
import { SITE_URL } from "@/lib/site-url";

export function buildLandingJsonLd() {
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LifeNode OS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Life orchestration platform that unifies Gmail, Slack, Notion, calendars, and health tools into role-based Nodes — one dashboard for operators tired of app fragmentation.",
    offers: [
      {
        "@type": "Offer",
        name: "Core",
        price: "0",
        priceCurrency: "USD",
        description: "Free tier with BizNode, VANode, and HomeNode",
      },
      {
        "@type": "Offer",
        name: "Sync",
        price: "19",
        priceCurrency: "USD",
        description: "Paid tier with VitalNode, Logic Bridges, and higher limits (annual billing)",
      },
      {
        "@type": "Offer",
        name: "Nexus",
        price: "49",
        priceCurrency: "USD",
        description: "Full access including TraderNode and ProNode (annual billing)",
      },
    ],
    featureList: [
      "Tool orchestration across Gmail, Slack, Google Calendar, and Notion",
      "Role-based Nodes for business, home, clients, trading, and health",
      "AI triage with Linos assistant",
      "Unified inbox and calendar sync",
      "Logic Bridges across nodes on paid plans",
    ],
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LifeNode OS",
    url: SITE_URL,
    logo: `${SITE_URL}/lifenode-os-logo.png`,
    sameAs: [SITE_URL],
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "LifeNode OS",
    url: SITE_URL,
    description:
      "Life orchestration app and anti-fragmentation dashboard for multi-role operators.",
  };

  return [faqPage, softwareApp, organization, webSite];
}
