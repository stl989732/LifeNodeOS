import { auth } from "@/auth";
import { beginOAuthFlow } from "@/src/lib/integrations/beginOAuthFlow";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

/** GET — start OAuth: redirect to provider (or JSON `{ url }` when `format=json`). */
export async function GET(request: Request, context: RouteContext) {
  const { provider: providerParam } = await context.params;
  const url = new URL(request.url);
  const targetNode = url.searchParams.get("node")?.trim() || "BIZ";
  const appHint = url.searchParams.get("app");
  const jsonResponse =
    url.searchParams.get("format") === "json" ||
    request.headers.get("accept")?.includes("application/json") === true;

  const session = await auth();
  if (!session?.user?.id) {
    const signIn = new URL("/auth/signin", process.env.AUTH_URL ?? "http://localhost:3000");
    signIn.searchParams.set(
      "callbackUrl",
      `/api/integrations/${providerParam}?node=${encodeURIComponent(targetNode)}`,
    );
    const { NextResponse } = await import("next/server");
    return NextResponse.redirect(signIn);
  }

  const result = await beginOAuthFlow({
    providerParam,
    targetNode,
    appHint,
    session,
    jsonResponse,
  });

  return result.response;
}
