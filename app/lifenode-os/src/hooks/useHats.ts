"use client";

import { useLifeNodeContext } from "@/src/context/LifeNodeContext";

/**
 * Single source for Rail 1, Node Gallery, and Linos Assistant hat chips.
 * Wraps `configuredHats` on `LifeNodeContext`.
 */
export function useHats() {
  const {
    configuredHats,
    updateConfiguredHats,
    toggleConfiguredHat,
    setConfiguredHatsFromShellKeys,
  } = useLifeNodeContext();

  return {
    activeHats: configuredHats,
    updateActiveHats: updateConfiguredHats,
    toggleActiveHat: toggleConfiguredHat,
    syncActiveHatsFromShellKeys: setConfiguredHatsFromShellKeys,
  } as const;
}