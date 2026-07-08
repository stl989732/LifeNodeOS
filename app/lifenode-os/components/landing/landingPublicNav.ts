import { DOC_ROUTES } from "@/lib/docs/routes";
import { SUPPORT_ROUTES } from "@/lib/support/routes";

export const LANDING_NODE_LINKS = [
  { href: "/shell", label: "Dashboard" },
  { href: "/vanode", label: "VANode" },
  { href: "/work", label: "BizNode" },
  { href: "/home", label: "HomeNode" },
  { href: "/vital", label: "VitalNode" },
  { href: "/trader", label: "TraderNode" },
  { href: "/pro", label: "ProNode" },
] as const;

export const LANDING_EXPLORE_LINKS = [
  { href: "/catalog", label: "Full Catalog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#comparison", label: "Compare" },
  { href: "/#faq", label: "FAQ" },
] as const;

/** Documentation hub links — mobile menu & footer only (not top header). */
export const LANDING_DOC_LINKS = [
  { href: DOC_ROUTES.hub, label: "Documentation" },
  { href: DOC_ROUTES.guide, label: "User guide" },
  { href: DOC_ROUTES.about, label: "About LifeNode OS" },
  { href: DOC_ROUTES.platform, label: "Platform & tools" },
  { href: DOC_ROUTES.security, label: "Security" },
] as const;

export const LANDING_POLICY_LINKS = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
] as const;

export const LANDING_SUPPORT_ACTION_LINKS = [
  { href: SUPPORT_ROUTES.feedback, label: "Feedback & suggestions" },
  { href: SUPPORT_ROUTES.ticket, label: "Ticket escalation" },
] as const;

export const LANDING_SUPPORT_LINKS = [
  ...LANDING_DOC_LINKS,
  ...LANDING_SUPPORT_ACTION_LINKS,
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/catalog", label: "Full Catalog" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#comparison", label: "Compare" },
      { href: "/#faq", label: "FAQ" },
      { href: DOC_ROUTES.hub, label: "Documentation" },
      { href: DOC_ROUTES.guide, label: "User Guide" },
    ],
  },
  {
    title: "Nodes",
    links: LANDING_NODE_LINKS.map(({ href, label }) => ({ href, label })),
  },
  {
    title: "Policies",
    links: [
      ...LANDING_POLICY_LINKS,
      { href: "#", label: "Consent Preferences", consent: true as const },
    ],
  },
  {
    title: "Support",
    links: LANDING_SUPPORT_LINKS,
  },
] as const;
