/**
 * Push supabase/migrations to the linked remote project.
 * Requires: npx supabase login  (or SUPABASE_ACCESS_TOKEN in .env.local)
 * Optional: SUPABASE_DB_PASSWORD in .env.local (Project Settings → Database)
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const {
  resolveProjectRef,
  writeProjectRefFile,
} = require("./supabase-project-ref.cjs");

const appRoot = path.join(__dirname, "..");

try {
  const projectRef = resolveProjectRef(appRoot);
  writeProjectRefFile(appRoot, projectRef);
  console.log(`Supabase project ref: ${projectRef}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.error("\nMissing SUPABASE_ACCESS_TOKEN.");
  console.error("  1. Run:  npx supabase login");
  console.error(
    "  2. Or add SUPABASE_ACCESS_TOKEN to .env.local (Dashboard → Account → Access Tokens)\n",
  );
  process.exit(1);
}

const args = ["supabase", "db", "push", "--yes"];
const password = process.env.SUPABASE_DB_PASSWORD?.trim();
if (password) {
  args.push("-p", password);
}

const result = spawnSync("npx", args, {
  cwd: appRoot,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status === 0 ? 0 : result.status ?? 1);
