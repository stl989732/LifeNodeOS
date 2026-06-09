import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertUserConnectedApp } from "@/src/lib/integrations/userConnectedAppsDb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const app = searchParams.get("app");
  const node = searchParams.get("node");

  if (!app || !node) {
    return new NextResponse("Missing integration context parameters.", {
      status: 400,
    });
  }

  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return new NextResponse("Sign in to LifeNode OS before connecting apps.", {
      status: 401,
    });
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await upsertUserConnectedApp({
      user_id: userId,
      target_node: node,
      app_id: app,
      connection_status: "connected",
    });

    return new NextResponse(
      `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 32px 24px; background: #f8fafc;">
          <h2 style="color: #0f766e; margin-bottom: 8px;">Connection saved</h2>
          <p style="color: #64748b; max-width: 320px; margin: 0 auto 12px;">
            LifeNode OS linked <strong>${app}</strong> for ${node}. Live event sync for this provider is coming soon — your calendar dashboard will update automatically when OAuth is enabled.
          </p>
          <p style="color: #94a3b8; font-size: 13px;">This window will close…</p>
          <script>
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(
                  { type: "lifenode-integration-connected", app: ${JSON.stringify(app)}, node: ${JSON.stringify(node)} },
                  window.location.origin
                );
              }
            } catch (e) {}
            setTimeout(function () { window.close(); }, 1400);
          </script>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      },
    );
  } catch (err) {
    console.error("Mock OAuth callback failed:", err);
    return new NextResponse("Internal error during integration setup.", {
      status: 500,
    });
  }
}
