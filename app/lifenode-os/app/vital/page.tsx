import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import OnboardingGate from "@/src/components/OnboardingGate";
import GenericNodeCommandShell from "@/src/components/shell/GenericNodeCommandShell";
import VitalNode from "@/src/components/VitalNode";

export default function VitalNodePage() {
  return (
    <OnboardingGate node="VitalNode">
      <NodeRouteBinder node="VitalNode">
        <GenericNodeCommandShell>
          <VitalNode />
        </GenericNodeCommandShell>
      </NodeRouteBinder>
    </OnboardingGate>
  );
}
