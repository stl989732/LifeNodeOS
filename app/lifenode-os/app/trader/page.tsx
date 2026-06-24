import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import OnboardingGate from "@/src/components/OnboardingGate";
import PlanNodeGate from "@/src/components/billing/PlanNodeGate";
import DualRailCommandCenter from "@/src/components/shell/DualRailCommandCenter";
import TradeNode from "@/src/components/TradeNode";

export default function TraderNodePage() {
  return (
    <OnboardingGate node="TraderNode">
      <PlanNodeGate node="TraderNode">
        <NodeRouteBinder node="TraderNode">
          <DualRailCommandCenter
            showFeatureRail={false}
            workspaceTone="dark"
            stageBackground="none"
          >
            <TradeNode />
          </DualRailCommandCenter>
        </NodeRouteBinder>
      </PlanNodeGate>
    </OnboardingGate>
  );
}
