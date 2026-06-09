import { NextResponse } from "next/server";
import { isNodeWidgetKey } from "@/lib/node-widget-keys";
import {
  getNodeWidgets,
  upsertNodeWidget,
  parseWidgetKeysParam,
  NodeWidgetPersistenceError,
} from "@/lib/node-widget-data-store";
import { requirePersistenceAuth } from "@/lib/persistence-session";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET(request: Request) {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;
  const userId = authResult.userId;

  const { searchParams } = new URL(request.url);
  const keys = parseWidgetKeysParam(searchParams.get("keys"));
  if (!keys.length) {
    return NextResponse.json(
      { error: "KEYS_REQUIRED", message: "Pass ?keys=home.budget,vanode.dashboard" },
      { status: 400 },
    );
  }

  try {
    const records = await getNodeWidgets(userId, keys);
    const widgets: Record<string, { payload: unknown; updatedAt: string }> = {};
    for (const [key, row] of Object.entries(records)) {
      widgets[key] = { payload: row.payload, updatedAt: row.updatedAt };
    }
    return NextResponse.json({ widgets });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("GET /api/node-data:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
  const widgetKey =
    typeof obj.widgetKey === "string" ? obj.widgetKey.trim() : "";
  if (!isNodeWidgetKey(widgetKey)) {
    return NextResponse.json({ error: "INVALID_WIDGET_KEY" }, { status: 400 });
  }

  if (!("payload" in obj)) {
    return NextResponse.json({ error: "PAYLOAD_REQUIRED" }, { status: 400 });
  }

  try {
    const record = await upsertNodeWidget(userId, widgetKey, obj.payload);
    return NextResponse.json({
      ok: true,
      widgetKey: record.widgetKey,
      updatedAt: record.updatedAt,
    });
  } catch (e) {
    if (e instanceof NodeWidgetPersistenceError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const message = e instanceof Error ? e.message : "Server error";
    console.error("PUT /api/node-data:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
