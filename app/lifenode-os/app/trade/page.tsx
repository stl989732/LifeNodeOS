import NodeRouteBinder from "@/src/components/NodeRouteBinder";
import TradeNode from "@/src/components/TradeNode";

export default function TradeNodePage() {
  return (
    <NodeRouteBinder node="TraderNode">
      <TradeNode />
    </NodeRouteBinder>
  );
}
