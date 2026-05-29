"use client";

import { useLifeNode } from "@/src/context/LifeNodeContext";

/**
 * Exposes bridge signal metrics for Linos Assistant.
 * Signal values are driven by node dashboards and connected integrations —
 * not random demo simulation.
 */
export function useLinoIntelligence() {
  const {
    bridgeSignals,
    activeLogicBridgeAlerts,
    linoAlertsArmed,
    linoSignalsReady,
  } = useLifeNode();

  return {
    bizUnreadLeads: bridgeSignals.bizUnreadLeadCount,
    bizMinutesSinceFollowUp: bridgeSignals.bizLastFollowUpMinutesAgo,
    homeCalendarConflict: bridgeSignals.homeCalendarHasConflict,
    proFocusMinutes: Math.floor(bridgeSignals.proFocusSecondsWhileOnPro / 60),
    activeBridgeCount: activeLogicBridgeAlerts.length,
    linoAlertsArmed,
    linoSignalsReady,
  };
}
