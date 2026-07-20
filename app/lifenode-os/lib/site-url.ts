/**
 * Canonical public origin for SEO (sitemap, robots, canonical link tags).
 *
 * Vercel serves www as the primary host and 307-redirects the apex domain
 * to www — so every indexed URL must use www or Google reports duplicates.
 */
export const SITE_URL = "https://www.lifenodeos.com";

export const SITE_HOST = "www.lifenodeos.com";
