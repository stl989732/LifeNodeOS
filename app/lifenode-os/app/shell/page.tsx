import LifeNodeShell from "@/src/components/LifeNodeShell";
import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function ShellPage() {
  return (
    <NodeRouteBinder node="BizNode">
      <Suspense fallback={<div className="min-h-screen bg-[#0B0F17]" />}>
        <LifeNodeShell />
      </Suspense>
    </NodeRouteBinder>
  );
}
