import { cache } from "react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
  ACTIVE_TO_HAT_KEY,
  type ActiveNodeName,
} from "@/lib/node-mappings";
import { getNodeOnboarding } from "@/lib/user-state-store";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";

const nodePageChromePadClass =
  "min-h-full pt-[calc(env(safe-area-inset-top,0px)+var(--ln-node-nav-chrome-block))]";

const readNodeOnboarding = cache(
  async (userId: string, node: ActiveNodeName) =>
    getNodeOnboarding(userId, node),
);

/**
 * Gate around any Node page (`/work`, `/home`, `/vital`, `/pro`, `/trader`,
 * `/vanode`). Resolves the session server-side, looks up onboarding status
 * for the requested node, and redirects to `/onboarding/<hat>` when it
 * hasn't been completed yet.
 *
 * `DEV_FRESH_SESSION` makes this a pass-through so an operator who is
 * actively re-testing the onboarding flow doesn't get bounced on every
 * navigation. The real production path always runs.
 *
 * Top padding reserves space for globally fixed `NodeNavChrome` so hero
 * titles (“hats”) are not covered by Back / LifeNode Dashboard.
 */
export default async function OnboardingGate({
  node,
  children,
}: {
  node: ActiveNodeName;
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    const callback = encodeURIComponent(`/onboarding/${ACTIVE_TO_HAT_KEY[node]}`);
    redirect(`/auth/signin?callbackUrl=${callback}`);
  }

  if (DEV_FRESH_SESSION) {
    return <div className={nodePageChromePadClass}>{children}</div>;
  }

  // Lazy import keeps the file-store off the Edge bundle (matches the proxy.ts
  // discipline). Server components run in Node runtime so this is safe.
  const status = await readNodeOnboarding(session.user.id, node);
  if (!status.onboardingCompleted) {
    redirect(`/onboarding/${ACTIVE_TO_HAT_KEY[node]}`);
  }

  return <div className={nodePageChromePadClass}>{children}</div>;
}
