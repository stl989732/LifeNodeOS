import { NextResponse } from "next/server";
import { upsertUserConnectedApp } from "@/src/lib/integrations/userConnectedAppsDb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Extract parameters from the modern URL request
  const { searchParams } = new URL(request.url);
  const app = searchParams.get("app");
  const node = searchParams.get("node");
  const userId = searchParams.get("userId");

  if (!app || !node || !userId) {
    return new NextResponse("Missing integration context parameters.", {
      status: 400,
    });
  }

  try {
    // 1. Simulate a brief background synchronization delay (1.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 2. Update state to 'connected' in your public.user_connected_apps table
    await upsertUserConnectedApp({
      user_id: userId,
      target_node: node,
      app_id: app,
      connection_status: "connected",
    });

    // 3. Return clean HTML inside the popup window to tell it to auto-close
    return new NextResponse(
      `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #f8fafc;">
          <h2 style="color: #10b981;">Sync Complete!</h2>
          <p style="color: #64748b;">LifeNodeOS has linked your ${app} account.</p>
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
    console.error("Triage error during sync routing:", err);
    return new NextResponse("Internal error during integration setup.", {
      status: 500,
    });
  }
}
