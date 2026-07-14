"use client";

import { useCallback } from "react";
import type { EodLog, Invoice, LiveTranscriptSession } from "@/lib/vanode/types";
import type { ClientProfile } from "@/lib/vanode/types";
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";
import type { useVanodeStore } from "@/components/vanode/useVanodeStore";
import {
  localMonthUsageCount,
  requestMeterPlanResource,
} from "@/src/lib/billing/meterPlanResourceClient";

type Store = ReturnType<typeof useVanodeStore>;

export function useGatedVanodeActions(store: Store) {
  const { canAdd, promptUpgrade, entitlements } = usePlanEntitlements();

  const gatedAddClient = useCallback(
    (c: Omit<ClientProfile, "id">) => {
      if (!canAdd("va_clients", store.data.clients.length)) {
        promptUpgrade("va_clients");
        return "";
      }
      return store.addClient(c);
    },
    [canAdd, promptUpgrade, store],
  );

  const gatedAddEod = useCallback(
    async (log: Omit<EodLog, "id" | "createdAt">) => {
      const monthCount = localMonthUsageCount(store.data.eodLogs);
      const max = entitlements.maxEodRecords;
      if (!canAdd("eod_records", monthCount)) {
        promptUpgrade("eod_records");
        return null;
      }
      const meter = await requestMeterPlanResource("eod_records", monthCount, max);
      if (!meter.ok) {
        promptUpgrade("eod_records");
        return null;
      }
      return store.addEodLog(log);
    },
    [canAdd, entitlements.maxEodRecords, promptUpgrade, store],
  );

  const gatedAddInvoice = useCallback(
    async (inv: Omit<Invoice, "id" | "createdAt">) => {
      const monthCount = localMonthUsageCount(store.data.invoices);
      const max = entitlements.maxInvoices;
      if (!canAdd("invoices", monthCount)) {
        promptUpgrade("invoices");
        return null;
      }
      const meter = await requestMeterPlanResource("invoices", monthCount, max);
      if (!meter.ok) {
        promptUpgrade("invoices");
        return null;
      }
      return store.addInvoice(inv);
    },
    [canAdd, entitlements.maxInvoices, promptUpgrade, store],
  );

  const gatedAddTranscript = useCallback(
    async (row: Omit<LiveTranscriptSession, "id" | "createdAt">) => {
      const monthCount = localMonthUsageCount(store.data.liveTranscripts);
      const max = entitlements.maxTranscriptions;
      if (!canAdd("transcriptions", monthCount)) {
        promptUpgrade("transcriptions");
        return "";
      }
      const meter = await requestMeterPlanResource(
        "transcriptions",
        monthCount,
        max,
      );
      if (!meter.ok) {
        promptUpgrade("transcriptions");
        return "";
      }
      return store.addLiveTranscript(row);
    },
    [canAdd, entitlements.maxTranscriptions, promptUpgrade, store],
  );

  return {
    gatedAddClient,
    gatedAddEod,
    gatedAddInvoice,
    gatedAddTranscript,
  };
}
