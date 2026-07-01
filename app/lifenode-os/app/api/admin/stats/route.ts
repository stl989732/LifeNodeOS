import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminDashboardStats } from "@/src/lib/admin/getAdminDashboardStats";
import { isAdminUser } from "@/src/lib/admin/isAdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isAdminUser({ userId, email })) {
    return forbidden();
  }

  try {
    const stats = await getAdminDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[admin/stats] GET failed:", error);
    return NextResponse.json({ error: "ADMIN_STATS_FAILED" }, { status: 500 });
  }
}
