import nextDynamic from "next/dynamic";
import GenericNodeCommandShell from "@/src/components/shell/GenericNodeCommandShell";

export const dynamic = "force-dynamic";

function CalendarLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
      Loading calendar…
    </div>
  );
}

const CalendarDashboard = nextDynamic(
  () => import("@/src/components/calendar/CalendarDashboard"),
  { loading: CalendarLoading },
);

/** Calendar & tasks — always available (no node onboarding gate). */
export default function CalendarPage() {
  return (
    <div className="min-h-full pt-[calc(env(safe-area-inset-top,0px)+var(--ln-node-nav-chrome-block))]">
      <GenericNodeCommandShell workspaceTone="light">
        <CalendarDashboard />
      </GenericNodeCommandShell>
    </div>
  );
}
