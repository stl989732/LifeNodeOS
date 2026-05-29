import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import OnboardingGate from "@/src/components/OnboardingGate";
import HomeNode from "@/src/components/HomeNode";

export const dynamic = "force-dynamic";

export default function HomeNodePage() {
  return (
    <OnboardingGate node="HomeNode">
      <NodeRouteBinder node="HomeNode">
        <HomeNode />
      </NodeRouteBinder>
    </OnboardingGate>
  );
}
