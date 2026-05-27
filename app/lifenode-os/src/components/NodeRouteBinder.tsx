"use client";

import { useEffect, type ReactNode } from "react";
import { useLifeNode, type ActiveNode } from "@/src/context/LifeNodeContext";

export default function NodeRouteBinder({
  node,
  children,
}: {
  node: ActiveNode;
  children: ReactNode;
}) {
  const { setActiveNode, ensureHatForRoute } = useLifeNode();

  useEffect(() => {
    setActiveNode(node);
    ensureHatForRoute(node);
  }, [node, setActiveNode, ensureHatForRoute]);

  return <>{children}</>;
}
