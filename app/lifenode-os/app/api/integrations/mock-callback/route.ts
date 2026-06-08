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
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #f8fafc;">
          <h2 style="color: #10b981;">Sync Complete!</h2>
          <p style="color: #64748b;">LifeNode OS has linked your ${app} account.</p>
          <script>
            setTimeout(() => { window.close(); }, 1000);
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
