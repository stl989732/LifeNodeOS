import { NextResponse } from "next/server";
import {
  getUserState,
  patchUserState,
  UserStatePersistenceError,
  SHELL_HAT_KEYS,
  type ShellHatKey,
  type ActiveNodeName,
  type NodeOnboardingDraft,
  type UserStatePatch,
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

export async function GET() {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;
  const state = await getUserState(authResult.userId);
  return NextResponse.json({ state });
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

  const patch: UserStatePatch = {};

  if ("displayName" in obj) {
    const dn = obj.displayName;
    if (dn === null || typeof dn === "string") {
      patch.displayName = dn === null ? null : dn.trim().slice(0, 80);
    } else {
      return NextResponse.json(
        { error: "INVALID_DISPLAY_NAME" },
        { status: 400 }
      );
    }
  }

  if ("configuredHats" in obj) {
    if (!Array.isArray(obj.configuredHats)) {
      return NextResponse.json(
        { error: "INVALID_CONFIGURED_HATS" },
        { status: 400 }
      );
    }
    const allowed = new Set<string>(SHELL_HAT_KEYS);
    const hats = (obj.configuredHats as unknown[])
      .filter((h): h is string => typeof h === "string" && allowed.has(h))
      .filter((v, i, arr) => arr.indexOf(v) === i) as ShellHatKey[];
    patch.configuredHats = hats;
  }

  if ("lastActiveNode" in obj) {
    const last = obj.lastActiveNode;
    if (last === null) {
      patch.lastActiveNode = null;
    } else if (
      typeof last === "string" &&
      (ACTIVE_NODES as string[]).includes(last)
    ) {
      patch.lastActiveNode = last as ActiveNodeName;
    } else {
      return NextResponse.json(
        { error: "INVALID_LAST_ACTIVE_NODE" },
        { status: 400 }
      );
    }
  }

  if ("nodeOnboardingDraft" in obj) {
    const draftObj = obj.nodeOnboardingDraft;
    if (!draftObj || typeof draftObj !== "object") {
      return NextResponse.json(
        { error: "INVALID_ONBOARDING_DRAFT" },
        { status: 400 },
      );
    }
    const d = draftObj as Record<string, unknown>;
    const node = d.node;
    const draft = d.draft;
    if (
      typeof node !== "string" ||
      !(ACTIVE_NODES as string[]).includes(node) ||
      !draft ||
      typeof draft !== "object"
    ) {
      return NextResponse.json(
        { error: "INVALID_ONBOARDING_DRAFT" },
        { status: 400 },
      );
    }
    const raw = draft as Record<string, unknown>;
    const normalized: NodeOnboardingDraft = {
      stackSelections: Array.isArray(raw.stackSelections)
        ? raw.stackSelections.filter((s): s is string => typeof s === "string")
        : [],
      kpiSelections: Array.isArray(raw.kpiSelections)
        ? raw.kpiSelections.filter((s): s is string => typeof s === "string")
        : [],
      workflowName:
        typeof raw.workflowName === "string" ? raw.workflowName.slice(0, 120) : "",
      stepIdx:
        typeof raw.stepIdx === "number" && Number.isFinite(raw.stepIdx)
          ? Math.max(0, Math.min(2, Math.floor(raw.stepIdx)))
          : 0,
    };
    patch.nodeOnboardingDraft = {
      node: node as ActiveNodeName,
      draft: normalized,
    };
  }

  try {
    const state = await patchUserState(userId, patch);
    return NextResponse.json({ state });
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
