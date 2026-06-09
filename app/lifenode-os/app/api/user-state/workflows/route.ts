import { NextResponse } from "next/server";
import {
  addWorkflow,
  getUserState,
  type ActiveNodeName,
  type WorkflowInput,
} from "@/lib/user-state-store";
import { requirePersistenceAuth } from "@/lib/persistence-session";

export const runtime = "nodejs";

const ACTIVE_NODES: ActiveNodeName[] = [
  "BizNode",
  "HomeNode",
  "VitalNode",
  "TraderNode",
  "VANode",
  "ProNode",
];

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function isActiveNodeName(value: unknown): value is ActiveNodeName {
  return typeof value === "string" && (ACTIVE_NODES as string[]).includes(value);
}

export async function GET() {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;
  const state = await getUserState(authResult.userId);
  return NextResponse.json({ workflows: state.workflows });
}

export async function POST(request: Request) {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;
  const userId = authResult.userId;

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

  if (typeof obj.name !== "string" || !obj.name.trim()) {
    return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });
  }
  if (!isActiveNodeName(obj.triggerNode)) {
    return NextResponse.json(
      { error: "INVALID_TRIGGER_NODE" },
      { status: 400 }
    );
  }
  if (!isActiveNodeName(obj.actionNode)) {
    return NextResponse.json({ error: "INVALID_ACTION_NODE" }, { status: 400 });
  }
  if (typeof obj.triggerCondition !== "string") {
    return NextResponse.json(
      { error: "INVALID_TRIGGER_CONDITION" },
      { status: 400 }
    );
  }
  if (typeof obj.actionLabel !== "string") {
    return NextResponse.json(
      { error: "INVALID_ACTION_LABEL" },
      { status: 400 }
    );
  }

  const input: WorkflowInput = {
    name: obj.name.slice(0, 120),
    triggerNode: obj.triggerNode,
    triggerCondition: obj.triggerCondition.slice(0, 500),
    actionNode: obj.actionNode,
    actionLabel: obj.actionLabel.slice(0, 120),
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
  };

  const workflow = await addWorkflow(userId, input);
  return NextResponse.json({ workflow });
}
