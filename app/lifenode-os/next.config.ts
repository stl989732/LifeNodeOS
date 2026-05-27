import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Next project directory (lifenode-os), not the parent folder also named `app`. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    /** Tree-shake lucide barrel imports across the app (faster dev compile, smaller chunks). */
    optimizePackageImports: ["lucide-react"],
  },
  /** html-to-text and other Node-only deps used in API routes */
  serverExternalPackages: ["html-to-text"],
  transpilePackages: ["@excalidraw/excalidraw"],
  turbopack: {
    root: projectRoot,
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

export default nextConfig;
