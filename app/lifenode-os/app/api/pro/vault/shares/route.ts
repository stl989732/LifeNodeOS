import { NextResponse } from "next/server";
import { requirePersistenceAuth } from "@/lib/persistence-session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

type ShareBody = {
  vaultId?: string;
  snapshot?: unknown;
};

/** POST — create a time-limited public share link for an owned vault document. */
export async function POST(request: Request) {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;

  let body: ShareBody;
  try {
    body = (await request.json()) as ShareBody;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const vaultId = body.vaultId?.trim();
  if (!vaultId) {
    return NextResponse.json({ error: "MISSING_VAULT_ID" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: vault, error: vaultError } = await supabase
    .from("pronode_vault")
    .select("id")
    .eq("id", vaultId)
    .eq("user_id", authResult.userId)
    .maybeSingle();

  if (vaultError) {
    console.error("POST /api/pro/vault/shares vault lookup:", vaultError);
    return NextResponse.json({ error: "SHARE_FAILED" }, { status: 500 });
  }

  if (!vault) {
    return NextResponse.json({ error: "VAULT_NOT_FOUND" }, { status: 404 });
  }

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString();

  const { error: insertError } = await supabase.from("pronode_vault_shares").insert({
    vault_id: vaultId,
    token,
    snapshot: body.snapshot ?? {},
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("POST /api/pro/vault/shares insert:", insertError);
    return NextResponse.json({ error: "SHARE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    token,
    expiresAt,
    urlPath: `/pro/vault/share/${token}`,
  });
}
