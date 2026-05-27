/**
 * Link local Supabase CLI to the remote project (one-time setup).
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const {
  resolveProjectRef,
  writeProjectRefFile,
} = require("./supabase-project-ref.cjs");

const appRoot = path.join(__dirname, "..");

let projectRef;
try {
  projectRef = resolveProjectRef(appRoot);
  writeProjectRefFile(appRoot, projectRef);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.error("\nRun  npx supabase login  first (or set SUPABASE_ACCESS_TOKEN).\n");
  process.exit(1);
}

const args = ["supabase", "link", "--project-ref", projectRef, "--yes"];
const password = process.env.SUPABASE_DB_PASSWORD?.trim();
if (password) {
  args.push("-p", password);
}

console.log(`Linking to project ${projectRef}...`);
const result = spawnSync("npx", args, {
  cwd: appRoot,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status === 0 ? 0 : result.status ?? 1);
