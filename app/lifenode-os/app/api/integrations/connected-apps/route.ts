import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toConnectedAppId } from "@/src/lib/integrations/appProviderMap";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { canAddWithinPlanLimit } from "@/src/lib/billing/planLimits";
import { planLimitDeniedResponse } from "@/src/lib/billing/planLimitResponse";
import {
  listUserConnectedApps,
  upsertUserConnectedApp,
  type ConnectedAppStatus,
} from "@/src/lib/integrations/userConnectedAppsDb";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** GET — list connected app card states for the signed-in user (service role). */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) return unauthorized();

  try {
    const apps = await listUserConnectedApps(userId);
    return NextResponse.json({ apps });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("GET /api/integrations/connected-apps:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — set syncing/connected state for a node app card (service role). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id?.trim();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { node, app, status } = body as {
    node?: string;
    app?: string;
    status?: ConnectedAppStatus;
  };

  if (!node?.trim() || !app?.trim()) {
    return NextResponse.json({ error: "NODE_AND_APP_REQUIRED" }, { status: 400 });
  }

  const connectionStatus: ConnectedAppStatus =
    status === "connected" || status === "syncing" || status === "disconnected"
      ? status
      : "syncing";

  try {
    const plan = await getUserPlan(userId);
    const entitlements = getPlanEntitlements(plan);
    const appId = toConnectedAppId(app);
    const targetNode = node.trim().toUpperCase();
    const existingRows = await listUserConnectedApps(userId);
    const existing = existingRows.find(
      (row) =>
        row.target_node.toUpperCase() === targetNode &&
        row.app_id.toLowerCase() === appId.toLowerCase(),
    );
    const activeRows = existingRows.filter(
      (row) =>
        row.connection_status === "connected" ||
        row.connection_status === "syncing",
    );
    const becomingActive =
      connectionStatus === "connected" || connectionStatus === "syncing";
    const wasActive =
      existing?.connection_status === "connected" ||
      existing?.connection_status === "syncing";
    const isNewActiveSlot = becomingActive && !wasActive;

    if (
      isNewActiveSlot &&
      !canAddWithinPlanLimit(activeRows.length, entitlements.maxIntegrations)
    ) {
      return planLimitDeniedResponse({
        limit: "integrations",
        current: activeRows.length,
        max: entitlements.maxIntegrations,
        planDisplayName: entitlements.displayName,
      });
    }

    await upsertUserConnectedApp({
      user_id: userId,
      target_node: node,
      app_id: appId,
      connection_status: connectionStatus,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("POST /api/integrations/connected-apps:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
