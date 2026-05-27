/**
 * Client-safe dev flags. `NEXT_PUBLIC_*` env vars are inlined at build time,
 * so `false` evaluates to a literal in the production bundle and the gated
 * branches dead-code-eliminate cleanly.
 */

/**
 * Treat every page load as a fresh session: skip server reads + writes for
 * shell hats, last active node, and workflows. Lets the operator re-test the
 * onboarding + workflow flows without persisted state contaminating runs.
 *
 * MUST be `0` / unset for production deploys.
 */
export const DEV_FRESH_SESSION =
  process.env.NEXT_PUBLIC_LIFENODE_DEV_FRESH_SESSION === "1";
