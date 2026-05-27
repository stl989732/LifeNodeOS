import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ACTIVE_NODE_NAMES,
  appendNotification,
  clearNotifications,
  getNotifications,
  type ActiveNodeName,
} from "@/lib/user-state-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function isActiveNode(value: unknown): value is ActiveNodeName {
  return (
    typeof value === "string" && (ACTIVE_NODE_NAMES as string[]).includes(value)
  );
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();
  const notifications = await getNotifications(userId);
  return NextResponse.json({ notifications });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
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
  const obj = body as Record<string, unknown>;

  if (typeof obj.bridgeId !== "string" || !obj.bridgeId.trim()) {
    return NextResponse.json({ error: "INVALID_BRIDGE_ID" }, { status: 400 });
  }
  if (typeof obj.message !== "string" || !obj.message.trim()) {
    return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });
  }

  const notif = await appendNotification(userId, {
    bridgeId: obj.bridgeId.slice(0, 120),
    triggerSource:
      typeof obj.triggerSource === "string"
        ? obj.triggerSource.slice(0, 120)
        : "",
    message: obj.message.slice(0, 500),
    targetNode: isActiveNode(obj.targetNode) ? obj.targetNode : null,
    primaryActionLabel:
      typeof obj.primaryActionLabel === "string"
        ? obj.primaryActionLabel.slice(0, 120)
        : null,
  });
  return NextResponse.json({ notification: notif });
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();
  const notifications = await clearNotifications(userId);
  return NextResponse.json({ notifications });
}
