/**
 * Verify user_connected_apps rows are readable via service role (server API path).
 * Run from app/lifenode-os: npx tsx scripts/test-connected-apps-read.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { listUserConnectedApps } from "../src/lib/integrations/userConnectedAppsDb";

config({ path: resolve(__dirname, "../../../.env.local") });
config({ path: resolve(__dirname, "../.env.local"), override: true });

const TEST_USER_ID = "a71b9476-57b6-46d9-8d88-5e32c2d51693";

async function main() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_KEY?.trim()
    )
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local",
    );
  }

  const data = await listUserConnectedApps(TEST_USER_ID);
  console.log(JSON.stringify({ data, count: data.length }, null, 2));

  const slack = data.find((r) => r.app_id === "slack");
  const hubspot = data.find((r) => r.app_id === "hubspot");

  if (
    !slack ||
    slack.connection_status !== "connected" ||
    !hubspot ||
    hubspot.connection_status !== "syncing"
  ) {
    process.exit(1);
  }

  console.log("\nRead path OK: slack=connected, hubspot=syncing");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
