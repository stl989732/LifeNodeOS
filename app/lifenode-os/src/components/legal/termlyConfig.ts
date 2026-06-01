/**
 * Termly website UUID — identifies your site in Termly's CMP (cookie banner / preference center).
 * From Termly Dashboard → your website → Install → Resource Blocker snippet.
 * Override with NEXT_PUBLIC_TERMLY_WEBSITE_UUID in .env.local / Vercel if you use a different site.
 */
export const TERMLY_WEBSITE_UUID = (
  process.env.NEXT_PUBLIC_TERMLY_WEBSITE_UUID?.trim() ||
  "686781d8-505a-4c34-964a-ff53dc7674df"
).trim();

export const TERMLY_RESOURCE_BLOCKER_SRC =
  TERMLY_WEBSITE_UUID.length > 0
    ? `https://app.termly.io/resource-blocker/${TERMLY_WEBSITE_UUID}?autoBlock=on`
    : null;

/** Static trigger id — must exist in root layout HTML when Termly script runs. */
export const TERMLY_PREFERENCES_TRIGGER_ID = "termly-consent-preferences-trigger";
