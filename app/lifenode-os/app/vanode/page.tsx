import dynamic from "next/dynamic";
import { Suspense } from "react";
import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import OnboardingGate from "@/src/components/OnboardingGate";

function VANodeLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
      Loading VANode…
    </div>
  );
}

const VANodeDashboard = dynamic(
  () =>
    import("@/components/vanode/VANodeDashboard").then((mod) => ({
      default: mod.VANodeDashboard,
    })),
  { loading: VANodeLoading },
);

export default function VANodePage() {
  return (
    <OnboardingGate node="VANode">
      <NodeRouteBinder node="VANode">
        <Suspense fallback={<VANodeLoading />}>
          <VANodeDashboard />
        </Suspense>
      </NodeRouteBinder>
    </OnboardingGate>
  );
}
