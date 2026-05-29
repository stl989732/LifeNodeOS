"use client";

import { useEffect } from "react";
import type { ActiveNodeName } from "@/lib/node-mappings";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";

/** Tell LifeNodeContext this node has real user-entered data (unlocks Linos signal evaluation). */
export function useReportNodeUserData(
  node: ActiveNodeName,
  hasUserData: boolean,
) {
  const { reportNodeUserData } = useLifeNodeContext();

  useEffect(() => {
    reportNodeUserData(node, hasUserData);
    return () => reportNodeUserData(node, false);
  }, [node, hasUserData, reportNodeUserData]);
}
