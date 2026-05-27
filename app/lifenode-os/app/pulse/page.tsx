import dynamic from "next/dynamic";
import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import OnboardingGate from "@/src/components/OnboardingGate";
import GenericNodeCommandShell from "@/src/components/shell/GenericNodeCommandShell";

function LifePulseLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
      Loading LifePulse…
    </div>
  );
}

const LifePulseDashboard = dynamic(
  () => import("@/src/components/lifePulse/LifePulseDashboard"),
  { loading: LifePulseLoading },
);

export default function LifePulsePage() {
  return (
    <OnboardingGate node="HomeNode">
      <NodeRouteBinder node="HomeNode">
        <GenericNodeCommandShell workspaceTone="light">
          <LifePulseDashboard />
        </GenericNodeCommandShell>
      </NodeRouteBinder>
    </OnboardingGate>
  );
}
