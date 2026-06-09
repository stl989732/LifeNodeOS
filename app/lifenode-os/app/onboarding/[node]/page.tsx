import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import LinoOnboarding from "@/src/components/LinoOnboarding";
import {
  HAT_KEY_TO_ACTIVE,
  NODE_ROUTE,
  isShellHatKey,
} from "@/lib/node-mappings";
import { resolveSessionPersistence } from "@/lib/persistence-user-id";
import { getNodeOnboarding } from "@/lib/user-state-store";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";

export const dynamic = "force-dynamic";

export default async function NodeOnboardingPage({
  params,
}: {
  params: Promise<{ node: string }>;
}) {
  const { node: param } = await params;
  if (!isShellHatKey(param)) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    const callback = encodeURIComponent(`/onboarding/${param}`);
    redirect(`/auth/signin?callbackUrl=${callback}`);
  }

  const activeNode = HAT_KEY_TO_ACTIVE[param];

  if (!DEV_FRESH_SESSION) {
    try {
      const resolved = await resolveSessionPersistence(session);
      const userId = resolved?.userId ?? session.user.id;
      const status = await getNodeOnboarding(userId, activeNode);
      if (status.onboardingCompleted) {
        redirect(NODE_ROUTE[activeNode]);
      }
    } catch {
      /* allow onboarding UI when persistence is temporarily unavailable */
    }
  }

  return <LinoOnboarding node={activeNode} />;
}
