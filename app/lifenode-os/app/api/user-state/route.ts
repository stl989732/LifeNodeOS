import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserState,
  patchUserState,
  SHELL_HAT_KEYS,
  type ShellHatKey,
  type ActiveNodeName,
  type UserStatePatch,
} from "@/lib/user-state-store";

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
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();
  const state = await getUserState(userId);
  return NextResponse.json({ state });
}

export async function PUT(request: Request) {
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

  const state = await patchUserState(userId, patch);
  return NextResponse.json({ state });
}
