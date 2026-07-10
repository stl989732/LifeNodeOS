/**
 * Apply api_rate_limits migration when `npm run db:push` cannot run (no access token).
 * Uses SUPABASE_DB_PASSWORD + project ref, or falls back to `npm run db:push`.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

require("./load-env.cjs");

const appRoot = path.join(__dirname, "..");
const migrationPath = path.join(
  appRoot,
  "supabase/migrations/20260709180000_api_rate_limits.sql",
);
const { resolveProjectRef } = require("./supabase-project-ref.cjs");
const loadEnv = require("./load-env.cjs");

loadEnv(appRoot);

function hasAccessToken() {
  return Boolean(process.env.SUPABASE_ACCESS_TOKEN?.trim());
}

function hasDbPassword() {
  return Boolean(process.env.SUPABASE_DB_PASSWORD?.trim());
}

function runDbPush() {
  const result = spawnSync("npm", ["run", "db:push"], {
    cwd: appRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  process.exit(result.status === 0 ? 0 : result.status ?? 1);
}

function runPsql() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const ref = resolveProjectRef(appRoot);
  const password = process.env.SUPABASE_DB_PASSWORD.trim();
  const host = `db.${ref}.supabase.co`;
  const conn =
    process.env.SUPABASE_DB_URL?.trim() ||
    `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;

  const result = spawnSync("psql", [conn, "-v", "ON_ERROR_STOP=1", "-f", migrationPath], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PGPASSWORD: password },
  });

  if (result.status === 0) {
    console.log("Applied api_rate_limits migration via psql.");
    process.exit(0);
  }

  console.error("psql failed. Install PostgreSQL client or use npm run db:push.");
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(migrationPath)) {
  console.error("Migration file not found:", migrationPath);
  process.exit(1);
}

if (hasAccessToken()) {
  runDbPush();
}

if (hasDbPassword()) {
  runPsql();
}

console.error(
  "Cannot apply migration: set SUPABASE_ACCESS_TOKEN (npm run db:push) or SUPABASE_DB_PASSWORD (psql).",
);
process.exit(1);
