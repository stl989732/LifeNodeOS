import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";
import { buildSecurityHeaders } from "./lib/security-headers";

/** Next project directory (lifenode-os), not the parent folder also named `app`. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo/workspace root (LifeNodeOS) */
const workspaceRoot = path.resolve(projectRoot, "..", "..");

const nextConfig: NextConfig = {
  async headers() {
    const securityHeaders = buildSecurityHeaders();
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon.png",
        permanent: false,
      },
    ];
  },
  experimental: {
    /** Tree-shake lucide barrel imports across the app (faster dev compile, smaller chunks). */
    optimizePackageImports: ["lucide-react"],
  },
  /** html-to-text and other Node-only deps used in API routes */
  serverExternalPackages: ["html-to-text"],
  transpilePackages: ["@excalidraw/excalidraw"],
  turbopack: {
    // Vercel sets outputFileTracingRoot to the workspace root for monorepos.
    // Keep turbopack.root aligned to avoid root mismatch warnings during build.
    root: process.env.VERCEL ? workspaceRoot : projectRoot,
    /** Turbopack otherwise resolves `tailwindcss` from `LifeNodeOS/app` and fails (no node_modules). */
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules/tailwindcss"),
      "@tailwindcss/postcss": path.join(
        projectRoot,
        "node_modules/@tailwindcss/postcss"
      ),
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: "lifenode-systems",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  // Faster local dev — Sentry still loads via instrumentation-client in production builds.
  ...(process.env.NODE_ENV === "development"
    ? {
        disableServerWebpackPlugin: true,
        disableClientWebpackPlugin: true,
      }
    : {}),
});
