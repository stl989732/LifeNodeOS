"use client";

import DualRailCommandCenter from "./DualRailCommandCenter";

/**
 * Standard node layout: light sidebar + glassmorphic workspace stage.
 */
export default function GenericNodeCommandShell({
  children,
  workspaceTone = "light",
}: {
  children: React.ReactNode;
  workspaceTone?: "light" | "dark";
}) {
  return (
    <DualRailCommandCenter workspaceTone={workspaceTone} stageBackground="none">
      {children}
    </DualRailCommandCenter>
  );
}
