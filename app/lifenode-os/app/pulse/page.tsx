import nextDynamic from "next/dynamic";
import GenericNodeCommandShell from "@/src/components/shell/GenericNodeCommandShell";

export const dynamic = "force-dynamic";

function LifePulseLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
      Loading LifePulse…
    </div>
  );
}

const LifePulseDashboard = nextDynamic(
  () => import("@/src/components/lifePulse/LifePulseDashboard"),
  { loading: LifePulseLoading },
);

/**
 * LifePulse is always available — no node onboarding or app connections required.
 * Auth is enforced by the edge proxy; do not wrap with OnboardingGate(HomeNode).
 */
export default function LifePulsePage() {
  return (
    <div className="min-h-full pt-[calc(env(safe-area-inset-top,0px)+var(--ln-node-nav-chrome-block))]">
      <GenericNodeCommandShell workspaceTone="light">
        <LifePulseDashboard />
      </GenericNodeCommandShell>
    </div>
  );
}
