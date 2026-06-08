import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toConnectedAppId } from "@/src/lib/integrations/appProviderMap";
import {
  upsertUserConnectedApp,
  type ConnectedAppStatus,
} from "@/src/lib/integrations/userConnectedAppsDb";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
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
    await upsertUserConnectedApp({
      user_id: userId,
      target_node: node,
      app_id: toConnectedAppId(app),
      connection_status: connectionStatus,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("POST /api/integrations/connected-apps:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
