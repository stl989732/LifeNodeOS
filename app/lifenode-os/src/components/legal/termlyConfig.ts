/**
 * Termly website UUID — identifies your site in Termly's CMP (cookie banner / preference center).
 * From Termly Dashboard → your website → Install → Resource Blocker snippet.
 * Override with NEXT_PUBLIC_TERMLY_WEBSITE_UUID in .env.local / Vercel if you use a different site.
 *
 * Disabled in local dev by default — Termly injects DOM before hydration and breaks `/`.
 * Set NEXT_PUBLIC_TERMLY_ENABLED=1 to test the CMP locally.
 */
export const TERMLY_ENABLED =
  process.env.NEXT_PUBLIC_TERMLY_ENABLED === "1" ||
  (process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_TERMLY_ENABLED !== "0");

export const TERMLY_WEBSITE_UUID = TERMLY_ENABLED
  ? (
      process.env.NEXT_PUBLIC_TERMLY_WEBSITE_UUID?.trim() ||
      "686781d8-505a-4c34-964a-ff53dc7674df"
    ).trim()
  : "";

export const TERMLY_RESOURCE_BLOCKER_SRC =
  TERMLY_WEBSITE_UUID.length > 0
    ? `https://app.termly.io/resource-blocker/${TERMLY_WEBSITE_UUID}?autoBlock=on`
    : null;

/** Static trigger id — must exist in root layout HTML when Termly script runs. */
export const TERMLY_PREFERENCES_TRIGGER_ID = "termly-consent-preferences-trigger";
