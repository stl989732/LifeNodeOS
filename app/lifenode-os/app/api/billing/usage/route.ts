import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlanUsage } from "@/src/lib/billing/getPlanUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) return unauthorized();

  try {
    const usage = await getPlanUsage(userId);
    return NextResponse.json(usage);
  } catch (error) {
    console.error("[billing/usage] GET failed:", error);
    return NextResponse.json({ error: "USAGE_READ_FAILED" }, { status: 500 });
  }
}
