"use client";

import { useEffect } from "react";
import { useLifeNode } from "@/src/context/LifeNodeContext";

/**
 * Background monitors for BizNode (leads), HomeNode (calendar), and related signals.
 * ProNode focus duration is tracked in LifeNodeContext while Pro is the active hat.
 * Demo signal simulation runs only after Linos Alerts are armed (all hat onboardings done).
 */
export function useLinoIntelligence() {
  const {
    patchBridgeSignals,
    bridgeSignals,
    activeLogicBridgeAlerts,
    linoAlertsArmed,
  } = useLifeNode();

  useEffect(() => {
    if (!linoAlertsArmed) return;

    const id = window.setInterval(() => {
      patchBridgeSignals((s) => ({
        ...s,
        bizUnreadLeadCount: Math.min(
          24,
          s.bizUnreadLeadCount + (Math.random() > 0.88 ? 1 : 0),
        ),
        bizLastFollowUpMinutesAgo: s.bizLastFollowUpMinutesAgo + 3,
      }));
    }, 9000);
    return () => window.clearInterval(id);
  }, [patchBridgeSignals, linoAlertsArmed]);

  useEffect(() => {
    if (!linoAlertsArmed) return;

    const id = window.setInterval(() => {
      patchBridgeSignals((s) => {
        let ev = s.homeNextEventMinutesUntil;
        if (ev < 999) ev = Math.max(0, ev - 1);
        if (Math.random() > 0.91) ev = Math.floor(5 + Math.random() * 11);
        return {
          ...s,
          homeCalendarHasConflict:
            s.homeCalendarHasConflict || Math.random() > 0.94,
          homeNextEventMinutesUntil: ev,
        };
      });
    }, 14000);
    return () => window.clearInterval(id);
  }, [patchBridgeSignals, linoAlertsArmed]);

  useEffect(() => {
    if (!linoAlertsArmed) return;

    const id = window.setInterval(() => {
      patchBridgeSignals((s) => ({
        ...s,
        vaHighPriorityPingCount: Math.min(
          5,
          s.vaHighPriorityPingCount + (Math.random() > 0.91 ? 1 : 0),
        ),
        traderDailyPnlPercent:
          Math.random() > 0.92
            ? s.traderDailyPnlPercent - 0.35
            : s.traderDailyPnlPercent,
        homeFridgeMilkLow: s.homeFridgeMilkLow || Math.random() > 0.93,
        homeUserNearStore: s.homeUserNearStore || Math.random() > 0.93,
        vitalSleepScore:
          Math.random() > 0.95
            ? Math.max(32, s.vitalSleepScore - 2)
            : s.vitalSleepScore,
        proWorkloadScore:
          Math.random() > 0.95
            ? Math.min(92, s.proWorkloadScore + 4)
            : s.proWorkloadScore,
      }));
    }, 11000);
    return () => window.clearInterval(id);
  }, [patchBridgeSignals, linoAlertsArmed]);

  return {
    bizUnreadLeads: bridgeSignals.bizUnreadLeadCount,
    bizMinutesSinceFollowUp: bridgeSignals.bizLastFollowUpMinutesAgo,
    homeCalendarConflict: bridgeSignals.homeCalendarHasConflict,
    proFocusMinutes: Math.floor(bridgeSignals.proFocusSecondsWhileOnPro / 60),
    activeBridgeCount: activeLogicBridgeAlerts.length,
  };
}
