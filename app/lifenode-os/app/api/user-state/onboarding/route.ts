import { NextResponse } from "next/server";
import {
  ACTIVE_NODE_NAMES,
  NODE_ONBOARDING_STEPS,
  getAllNodeOnboarding,
  patchNodeOnboarding,
  UserStatePersistenceError,
  type ActiveNodeName,
  type NodeOnboardingStep,
} from "@/lib/user-state-store";
import { requirePersistenceAuth } from "@/lib/persistence-session";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function isActiveNode(value: unknown): value is ActiveNodeName {
  return (
    typeof value === "string" && (ACTIVE_NODE_NAMES as string[]).includes(value)
  );
}

function isStep(value: unknown): value is NodeOnboardingStep {
  return (
    typeof value === "string" &&
    (NODE_ONBOARDING_STEPS as string[]).includes(value)
  );
}

export async function GET() {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;
  const statuses = await getAllNodeOnboarding(authResult.userId);
  return NextResponse.json({ statuses });
}

export async function PUT(request: Request) {
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

  if (!isActiveNode(obj.node)) {
    return NextResponse.json({ error: "INVALID_NODE" }, { status: 400 });
  }
  if (obj.step !== undefined && !isStep(obj.step)) {
    return NextResponse.json({ error: "INVALID_STEP" }, { status: 400 });
  }

  try {
    const status = await patchNodeOnboarding(userId, obj.node, {
      step: isStep(obj.step) ? obj.step : undefined,
      completed:
        typeof obj.completed === "boolean" ? obj.completed : undefined,
      reset: obj.reset === true,
    });
    return NextResponse.json({ status });
  } catch (e) {
    if (e instanceof UserStatePersistenceError) {
      return NextResponse.json(
        { error: "PERSISTENCE_FAILED", message: e.message },
        { status: 503 },
      );
    }
    throw e;
  }
}
