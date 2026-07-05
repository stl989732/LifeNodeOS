/**
 * Load env files before spawning Next.js so secrets in the workspace root `.env.local`
 * are merged with `app/lifenode-os/.env.local` (Next app overrides on conflict).
 */
const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");

function localDevOrigin() {
  const host = process.env.LIFENODE_DEV_HOST?.trim() || "localhost";
  const port = process.env.PORT?.trim() || "3000";
  return `http://${host}:${port}`;
}

/** True when URL is a loopback dev origin (localhost / 127.0.0.1 / ::1) on the dev port. */
function isLocalDevOrigin(url) {
  if (!url?.trim()) return false;
  try {
    const { hostname, port, protocol } = new URL(url.trim());
    if (protocol !== "http:") return false;
    const devPort = process.env.PORT?.trim() || "3000";
    const portOk = port === devPort || port === "";
    const hostOk =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1";
    return hostOk && portOk;
  } catch {
    return false;
  }
}

function isRemoteProductionOrigin(url) {
  if (!url?.trim()) return false;
  try {
    const { hostname, protocol } = new URL(url.trim());
    if (protocol !== "https:") return false;
    return (
      hostname === "lifenodeos.com" ||
      hostname === "www.lifenodeos.com" ||
      hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

/**
 * Vercel-pulled `.env.local` often sets AUTH_URL to production. That breaks
 * Google OAuth and session cookies when developing on localhost:3000.
 * Also normalizes 127.0.0.1 ↔ localhost so cookies match the browser URL.
 */
function applyLocalDevUrlOverrides() {
  const localOrigin = localDevOrigin();
  let patched = false;

  const syncLocal = (key) => {
    const value = process.env[key]?.trim();
    if (
      isRemoteProductionOrigin(value) ||
      !value ||
      (isLocalDevOrigin(value) && value !== localOrigin)
    ) {
      process.env[key] = localOrigin;
      patched = true;
    }
  };

  syncLocal("AUTH_URL");
  syncLocal("NEXT_PUBLIC_APP_URL");

  if (patched) {
    console.log(
      `[LifeNode OS] Local dev URLs → AUTH_URL / NEXT_PUBLIC_APP_URL = ${localOrigin}`,
    );
    console.log(
      "[LifeNode OS] For Google sign-in, add this redirect URI in Google Cloud:\n" +
        `  ${localOrigin}/api/auth/callback/google\n`,
    );
  }
}

/**
 * Ensure NEXT_PUBLIC_SUPABASE_URL matches supabase/project-ref (fixes dqu vs dqq typo).
 */
function applySupabaseUrlFromProjectRef(appRoot) {
  const refPath = path.join(appRoot, "supabase", "project-ref");
  let canonicalRef = process.env.SUPABASE_PROJECT_REF?.trim();
  if (!canonicalRef) {
    try {
      canonicalRef = fs.readFileSync(refPath, "utf8").trim();
    } catch {
      return;
    }
  }
  if (!canonicalRef) return;

  const canonicalUrl = `https://${canonicalRef}.supabase.co`;
  const current = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!current) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = canonicalUrl;
    console.log(
      `[LifeNode OS] NEXT_PUBLIC_SUPABASE_URL → ${canonicalUrl} (from project-ref)`,
    );
    return;
  }

  if (current !== canonicalUrl) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = canonicalUrl;
    console.log(
      `[LifeNode OS] Corrected NEXT_PUBLIC_SUPABASE_URL → ${canonicalUrl} (repo project-ref)`,
    );
  }
}

/**
 * @param {string} appRoot Absolute path to the Next.js app root (directory containing package.json).
 */
function loadEnv(appRoot) {
  /** Monorepo: Next app is `LifeNodeOS/app/lifenode-os`; secrets often live at `LifeNodeOS/.env.local`. */
  const workspaceRootEnv = path.join(appRoot, "..", "..", ".env.local");
  const appEnv = path.join(appRoot, ".env.local");

  dotenv.config({ path: workspaceRootEnv });
  dotenv.config({ path: appEnv, override: true });

  applySupabaseUrlFromProjectRef(appRoot);
  applyLocalDevUrlOverrides();
}

module.exports = loadEnv;
