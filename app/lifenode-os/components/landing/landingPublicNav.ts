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
  { href: "/pricing", label: "Pricing" },
  { href: "/catalog", label: "Full Catalog" },
  { href: "/#faq", label: "FAQ" },
] as const;

export const LANDING_POLICY_LINKS = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
] as const;

export const LANDING_SUPPORT_LINKS = [
  { href: "/docs", label: "User guide" },
  { href: SUPPORT_ROUTES.feedback, label: "Feedback & suggestions" },
  { href: SUPPORT_ROUTES.ticket, label: "Ticket escalation" },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/catalog", label: "Full Catalog" },
      { href: "/#faq", label: "FAQ" },
      { href: "/docs", label: "User Guide" },
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
