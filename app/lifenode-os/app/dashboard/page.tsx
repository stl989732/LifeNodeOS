import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ContextualDashboard from "@/src/components/ContextualDashboard";
import { getUserState } from "@/lib/user-state-store";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  // In DEV_FRESH_SESSION we render the empty-state branch unconditionally so
  // the operator can see / re-test that path. Real production reads from disk.
  if (DEV_FRESH_SESSION) {
    return (
      <ContextualDashboard
        displayName={session.user.name ?? null}
        projects={[]}
      />
    );
  }

  const state = await getUserState(session.user.id);
  return (
    <ContextualDashboard
      displayName={state.displayName ?? session.user.name ?? null}
      projects={state.projects}
    />
  );
}
