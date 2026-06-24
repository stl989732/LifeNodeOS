/**
 * Smoke test: POST /api/integrations/connected-apps with a signed session JWT.
 * Run from app/lifenode-os: npx tsx scripts/test-connected-apps-api.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { encode } from "next-auth/jwt";

// Workspace root has live Supabase URL/keys; app .env.local may blank them out.
config({ path: resolve(__dirname, "../../../.env.local") });
config({ path: resolve(__dirname, "../.env.local"), override: true });

const BASE =
  process.env.AUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

function resolveAuthSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

/** Verified credential_users row (text id matches NextAuth session.user.id). */
const TEST_USER_ID = "a71b9476-57b6-46d9-8d88-5e32c2d51693";
const TEST_NODE = "VA";
const TEST_APP = "slack";

async function main() {
  const secret = resolveAuthSecret();

  const sessionToken = await encode({
    token: {
      sub: TEST_USER_ID,
      email: "anncustodio@yahho.com",
      name: "API test",
    },
    secret,
    salt: "authjs.session-token",
  });

  const cookie = `authjs.session-token=${sessionToken}`;

  const res = await fetch(`${BASE}/api/integrations/connected-apps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      node: TEST_NODE,
      app: TEST_APP,
      status: "connected",
    }),
  });

  const body = await res.json().catch(() => null);
  console.log(JSON.stringify({ status: res.status, body }, null, 2));

  if (!res.ok) {
    process.exit(1);
  }

  console.log(
    `\nUpsert requested for user=${TEST_USER_ID} node=${TEST_NODE} app=${TEST_APP}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
