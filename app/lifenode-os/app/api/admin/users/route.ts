import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getAdminUserDirectory,
  type AdminUserSegment,
} from "@/src/lib/admin/getAdminUserDirectory";
import { isAdminUser } from "@/src/lib/admin/isAdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEGMENTS = new Set<AdminUserSegment>([
  "registered",
  "active",
  "deleted",
  "subscriptions",
]);

function forbidden() {
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isAdminUser({ userId, email })) {
    return forbidden();
  }

  const { searchParams } = new URL(request.url);
  const segment = searchParams.get("segment") as AdminUserSegment | null;

  if (!segment || !SEGMENTS.has(segment)) {
    return NextResponse.json(
      { error: "INVALID_SEGMENT", valid: [...SEGMENTS] },
      { status: 400 },
    );
  }

  try {
    const directory = await getAdminUserDirectory(segment);
    return NextResponse.json(directory);
  } catch (error) {
    console.error("[admin/users] GET failed:", error);
    return NextResponse.json({ error: "ADMIN_USERS_FAILED" }, { status: 500 });
  }
}
