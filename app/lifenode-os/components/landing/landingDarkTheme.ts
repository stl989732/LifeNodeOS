/**
 * Dark landing zone typography tokens.
 *
 * Wrap sections in `landing-dark-zone` (see globals.css) and use these classes
 * instead of one-off hex values — retune contrast in one place.
 *
 * Browser-preview targets (Jun 2026):
 * - plan tagline: #505862 → bumped to --landing-text-plan-tagline for contrast
 * - disclaimer: #BBC9DD
 * - FAQ subtitle: #AFBACA
 * - VitalNode kicker: #757D95 → bumped to --landing-text-feature-label-alt
 */
export const LANDING_DARK_ZONE_CLASS = "landing-dark-zone";

export const landingDarkText = {
  subtitle: "text-landing-subtitle",
  disclaimer: "text-landing-disclaimer",
  planTagline: "text-landing-plan-tagline",
  featureLabel: "text-landing-feature-label",
  featureLabelAlt: "text-landing-feature-label-alt",
} as const;
