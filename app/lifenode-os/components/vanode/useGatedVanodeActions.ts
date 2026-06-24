"use client";

import { useCallback } from "react";
import type { EodLog, Invoice, LiveTranscriptSession } from "@/lib/vanode/types";
import type { ClientProfile } from "@/lib/vanode/types";
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";
import type { useVanodeStore } from "@/components/vanode/useVanodeStore";

type Store = ReturnType<typeof useVanodeStore>;

export function useGatedVanodeActions(store: Store) {
  const { canAdd, promptUpgrade } = usePlanEntitlements();

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
    (log: Omit<EodLog, "id" | "createdAt">) => {
      if (!canAdd("eod_records", store.data.eodLogs.length)) {
        promptUpgrade("eod_records");
        return null;
      }
      return store.addEodLog(log);
    },
    [canAdd, promptUpgrade, store],
  );

  const gatedAddInvoice = useCallback(
    (inv: Omit<Invoice, "id" | "createdAt">) => {
      if (!canAdd("invoices", store.data.invoices.length)) {
        promptUpgrade("invoices");
        return null;
      }
      return store.addInvoice(inv);
    },
    [canAdd, promptUpgrade, store],
  );

  const gatedAddTranscript = useCallback(
    (row: Omit<LiveTranscriptSession, "id" | "createdAt">) => {
      if (!canAdd("transcriptions", store.data.liveTranscripts.length)) {
        promptUpgrade("transcriptions");
        return "";
      }
      return store.addLiveTranscript(row);
    },
    [canAdd, promptUpgrade, store],
  );

  return {
    gatedAddClient,
    gatedAddEod,
    gatedAddInvoice,
    gatedAddTranscript,
  };
}
