import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import GenericNodeCommandShell from "@/src/components/shell/GenericNodeCommandShell";

export const dynamic = "force-dynamic";

function InboxLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
      Loading inbox…
    </div>
  );
}

const InboxDashboard = nextDynamic(
  () => import("@/src/components/inbox/InboxDashboard"),
  { loading: InboxLoading },
);

/** Shell unified inbox — Gmail, Slack, Google Calendar orchestrator. */
export default function InboxPage() {
  return (
    <div className="min-h-full px-3 pb-6 pt-[calc(env(safe-area-inset-top,0px)+var(--ln-node-nav-chrome-block))] md:px-5">
      <GenericNodeCommandShell workspaceTone="light">
        <Suspense fallback={<InboxLoading />}>
          <InboxDashboard />
        </Suspense>
      </GenericNodeCommandShell>
    </div>
  );
}
