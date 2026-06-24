import { NextResponse } from "next/server";
import { requirePersistenceAuth } from "@/lib/persistence-session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

/** GET — list vault documents for the signed-in persistence user. */
export async function GET(request: Request) {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const nodeTypes = url.searchParams.get("nodeTypes")?.split(",").filter(Boolean);

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("pronode_vault")
    .select("id,title,node_type,content,updated_at,user_id")
    .eq("user_id", authResult.userId)
    .order("updated_at", { ascending: false });

  if (nodeTypes && nodeTypes.length === 1) {
    query = query.eq("node_type", nodeTypes[0]);
  } else if (nodeTypes && nodeTypes.length > 1) {
    query = query.in("node_type", nodeTypes);
  }

  const { data, error } = await query;
  if (error) {
    console.error("GET /api/pro/vault:", error);
    return NextResponse.json({ error: "VAULT_LIST_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

type UpsertBody = {
  id?: string;
  title?: string;
  node_type?: string;
  content?: unknown;
};

/** PUT — create or update a vault document owned by the signed-in user. */
export async function PUT(request: Request) {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "MISSING_VAULT_ID" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const payload = {
    id,
    user_id: authResult.userId,
    title: body.title?.trim() || "Untitled",
    node_type: body.node_type?.trim() || "General",
    content: body.content ?? {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("pronode_vault")
    .upsert(payload, { onConflict: "id" })
    .select("id,title,node_type,content,updated_at,user_id")
    .single();

  if (error) {
    console.error("PUT /api/pro/vault:", error);
    return NextResponse.json({ error: "VAULT_SAVE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
