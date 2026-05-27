import LifeNodeShell from "@/src/components/LifeNodeShell";
import NodeRouteBinder from "@/src/components/NodeRouteBinder";

export default function ShellPage() {
  return (
    <NodeRouteBinder node="BizNode">
      <LifeNodeShell />
    </NodeRouteBinder>
  );
}
