import dynamic from "next/dynamic";
import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import OnboardingGate from "@/src/components/OnboardingGate";
import GenericNodeCommandShell from "@/src/components/shell/GenericNodeCommandShell";

function WorkNodeLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
      Loading BizNode…
    </div>
  );
}

const WorkNode = dynamic(() => import("@/src/components/WorkNode"), {
  loading: WorkNodeLoading,
});

export default function WorkNodePage() {
  return (
    <OnboardingGate node="BizNode">
      <NodeRouteBinder node="BizNode">
        <GenericNodeCommandShell>
          <WorkNode />
        </GenericNodeCommandShell>
      </NodeRouteBinder>
    </OnboardingGate>
  );
}
