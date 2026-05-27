import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import OnboardingGate from "@/src/components/OnboardingGate";
import DualRailCommandCenter from "@/src/components/shell/DualRailCommandCenter";
import TradeNode from "@/src/components/TradeNode";

export default function TraderNodePage() {
  return (
    <OnboardingGate node="TraderNode">
      <NodeRouteBinder node="TraderNode">
        <DualRailCommandCenter
          showFeatureRail={false}
          workspaceTone="dark"
          stageBackground="none"
        >
          <TradeNode />
        </DualRailCommandCenter>
      </NodeRouteBinder>
    </OnboardingGate>
  );
}
