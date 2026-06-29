/**
 * Load env files before spawning Next.js so secrets in the workspace root `.env.local`
 * are merged with `app/lifenode-os/.env.local` (Next app overrides on conflict).
 */
const path = require("node:path");
const dotenv = require("dotenv");

function localDevOrigin() {
  const host = process.env.LIFENODE_DEV_HOST?.trim() || "127.0.0.1";
  const port = process.env.PORT?.trim() || "3000";
  return `http://${host}:${port}`;
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
 * Google OAuth and session cookies when developing on 127.0.0.1:3000.
 */
function applyLocalDevUrlOverrides() {
  const localOrigin = localDevOrigin();
  let patched = false;

  if (isRemoteProductionOrigin(process.env.AUTH_URL) || !process.env.AUTH_URL?.trim()) {
    process.env.AUTH_URL = localOrigin;
    patched = true;
  }
  if (
    isRemoteProductionOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    !process.env.NEXT_PUBLIC_APP_URL?.trim()
  ) {
    process.env.NEXT_PUBLIC_APP_URL = localOrigin;
    patched = true;
  }

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
 * @param {string} appRoot Absolute path to the Next.js app root (directory containing package.json).
 */
function loadEnv(appRoot) {
  /** Monorepo: Next app is `LifeNodeOS/app/lifenode-os`; secrets often live at `LifeNodeOS/.env.local`. */
  const workspaceRootEnv = path.join(appRoot, "..", "..", ".env.local");
  const appEnv = path.join(appRoot, ".env.local");

  dotenv.config({ path: workspaceRootEnv });
  dotenv.config({ path: appEnv, override: true });

  applyLocalDevUrlOverrides();
}

module.exports = loadEnv;
