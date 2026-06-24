import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import OnboardingGate from "@/src/components/OnboardingGate";
import PlanNodeGate from "@/src/components/billing/PlanNodeGate";
import GenericNodeCommandShell from "@/src/components/shell/GenericNodeCommandShell";
import ProNode from "@/src/components/ProNode";

export default function ProNodePage() {
  return (
    <OnboardingGate node="ProNode">
      <PlanNodeGate node="ProNode">
        <NodeRouteBinder node="ProNode">
          <GenericNodeCommandShell>
            <ProNode />
          </GenericNodeCommandShell>
        </NodeRouteBinder>
      </PlanNodeGate>
    </OnboardingGate>
  );
}
