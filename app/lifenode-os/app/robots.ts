import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** App routes that require auth — Google should not crawl (they 307 to sign-in). */
const PRIVATE_DISALLOW = [
  "/auth/",
  "/api/",
  "/_next/",
  "/admin",
  "/shell",
  "/dashboard",
  "/work",
  "/home",
  "/calendar",
  "/pulse",
  "/vanode",
  "/vital",
  "/pro",
  "/trade",
  "/trader",
  "/inbox",
  "/onboarding",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PRIVATE_DISALLOW],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: [...PRIVATE_DISALLOW],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: [...PRIVATE_DISALLOW],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: [...PRIVATE_DISALLOW],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: [...PRIVATE_DISALLOW],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: [...PRIVATE_DISALLOW],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: [...PRIVATE_DISALLOW],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
