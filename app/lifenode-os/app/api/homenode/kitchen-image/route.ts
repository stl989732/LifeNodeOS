import { NextResponse } from "next/server";
import { buildPollinationsDishUrl } from "@/src/lib/kitchenDishImage";
import { enforcePublicProxyRateLimit } from "@/src/lib/rateLimit/enforceRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUERY_LEN = 480;
const UPSTREAM_TIMEOUT_MS = 20_000;

/** Same-origin proxy for Pollinations dish photos (avoids client ad-blocker blocks). */
export async function GET(request: Request) {
  const rateLimited = await enforcePublicProxyRateLimit(request, "kitchen-image");
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const attemptRaw = Number(searchParams.get("attempt") ?? "0");
  const attempt = Number.isFinite(attemptRaw) ? Math.max(0, Math.min(4, attemptRaw)) : 0;

  if (!q || q.length > MAX_QUERY_LEN) {
    return NextResponse.json({ error: "Invalid image query." }, { status: 400 });
  }

  const upstream = buildPollinationsDishUrl(q, attempt);
  if (!upstream) {
    return NextResponse.json({ error: "Could not build image URL." }, { status: 400 });
  }

  try {
    const res = await fetch(upstream, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Image upstream failed.", status: res.status },
        { status: 502 },
      );
    }
    const bytes = await res.arrayBuffer();
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Image fetch failed.", details: message }, { status: 504 });
  }
}
