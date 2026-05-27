/**
 * Load env files before spawning Next.js so secrets in the workspace root `.env.local`
 * are merged with `app/lifenode-os/.env.local` (Next app overrides on conflict).
 */
const path = require("node:path");
const dotenv = require("dotenv");

/**
 * @param {string} appRoot Absolute path to the Next.js app root (directory containing package.json).
 */
function loadEnv(appRoot) {
  /** Monorepo: Next app is `LifeNodeOS/app/lifenode-os`; secrets often live at `LifeNodeOS/.env.local`. */
  const workspaceRootEnv = path.join(appRoot, "..", "..", ".env.local");
  const appEnv = path.join(appRoot, ".env.local");

  dotenv.config({ path: workspaceRootEnv });
  dotenv.config({ path: appEnv, override: true });

  if (!process.env.AUTH_URL?.trim()) {
    process.env.AUTH_URL = "http://localhost:3000";
  }
}

module.exports = loadEnv;
