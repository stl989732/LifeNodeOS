export const DOC_ROUTES = {
  hub: "/docs",
  about: "/docs/about",
  guide: "/docs/guide",
  platform: "/docs/platform",
  security: "/docs/security",
} as const;

export const DOC_NAV_ITEMS = [
  { href: DOC_ROUTES.hub, label: "Overview" },
  { href: DOC_ROUTES.about, label: "About" },
  { href: DOC_ROUTES.guide, label: "User guide" },
  { href: DOC_ROUTES.platform, label: "Platform & tools" },
  { href: DOC_ROUTES.security, label: "Security" },
] as const;
