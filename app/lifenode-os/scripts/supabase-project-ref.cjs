/**
 * Resolve Supabase project ref and write supabase/.temp/project-ref for the CLI.
 */
const fs = require("node:fs");
const path = require("node:path");
const loadEnv = require("./load-env.cjs");

/**
 * @param {string} appRoot
 * @returns {string}
 */
function resolveProjectRef(appRoot) {
  loadEnv(appRoot);

  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const fromUrl = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (fromUrl) return fromUrl[1];

  const refFile = path.join(appRoot, "supabase", "project-ref");
  if (fs.existsSync(refFile)) {
    const fromFile = fs.readFileSync(refFile, "utf8").trim();
    if (fromFile) return fromFile;
  }

  throw new Error(
    "Cannot resolve Supabase project ref. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PROJECT_REF in .env.local, or add supabase/project-ref.",
  );
}

/**
 * @param {string} appRoot
 * @param {string} projectRef
 */
function writeProjectRefFile(appRoot, projectRef) {
  const tempDir = path.join(appRoot, "supabase", ".temp");
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(path.join(tempDir, "project-ref"), projectRef, "utf8");
}

module.exports = { resolveProjectRef, writeProjectRefFile };
