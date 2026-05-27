"use client";

import { LayoutDashboard } from "lucide-react";
import DualRailCommandCenter from "./DualRailCommandCenter";

const DECK: { id: string; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "deck", label: "Command deck", icon: LayoutDashboard },
];

/**
 * Standard nodes: Rail 1 (hats) + Rail 2 (single “Command deck” entry) + workspace.
 * Per-node dashboards keep their own backgrounds inside the stage.
 */
export default function GenericNodeCommandShell({
  children,
  workspaceTone = "light",
}: {
  children: React.ReactNode;
  workspaceTone?: "light" | "dark";
}) {
  return (
    <DualRailCommandCenter
      showFeatureRail
      featureNav={DECK}
      activeFeatureId="deck"
      stageBackground="none"
      workspaceTone={workspaceTone}
    >
      {children}
    </DualRailCommandCenter>
  );
}
