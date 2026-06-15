"use client";

import { Plus, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { startOAuthConnect } from "@/src/lib/integrations";
import { useConnectedApps } from "@/src/lib/useConnectedApps";
import IntegrationLogo from "./IntegrationLogo";
import type { InboxSource } from "@/src/lib/orchestrator/types";

const INBOX_APPS: { id: InboxSource; label: string; provider: string }[] = [
  { id: "gmail", label: "Gmail", provider: "gmail" },
  { id: "slack", label: "Slack", provider: "slack" },
  {
    id: "google_calendar",
    label: "Calendar",
    provider: "google_calendar",
  },
];

export default function IntegrationRail({
  className = "",
}: {
  className?: string;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const { connectedApps, loading } = useConnectedApps(userId);
  const [connecting, setConnecting] = useState<string | null>(null);

  const isConnected = useCallback(
    (appId: string) => {
      const key = `inbox_${appId.toLowerCase()}`;
      if (connectedApps[key] === "connected") return true;
      const vaKey = `va_${appId.toLowerCase()}`;
      if (connectedApps[vaKey] === "connected") return true;
      const calKey = `calendar_${appId.toLowerCase()}`;
      if (connectedApps[calKey] === "connected") return true;
      if (appId === "google_calendar" && connectedApps.calendar_google === "connected") {
        return true;
      }
      return false;
    },
    [connectedApps],
  );

  async function handleConnect(appId: string) {
    setConnecting(appId);
    try {
      await startOAuthConnect("INBOX", appId);
    } finally {
      setConnecting(null);
    }
  }

  return (
    <aside
      className={`flex w-14 shrink-0 flex-col items-center gap-3 border-l border-slate-200/80 bg-[#F8F8FF] py-4 ${className}`}
      aria-label="Connected apps"
    >
      {INBOX_APPS.map(({ id, label }) => {
        const connected = isConnected(id);
        const busy = connecting === id;
        return (
          <button
            key={id}
            type="button"
            title={connected ? `${label} connected` : `Connect ${label}`}
            onClick={() => void handleConnect(id)}
            disabled={busy || loading}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              connected
                ? "border-emerald-300/80 bg-emerald-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <IntegrationLogo source={id} size={22} />
            )}
            {connected ? (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#F8F8FF]" />
            ) : null}
          </button>
        );
      })}
      <button
        type="button"
        title="Connect another app"
        onClick={() => void handleConnect("gmail")}
        className="mt-auto flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-500 hover:bg-white"
      >
        <Plus className="h-4 w-4" />
      </button>
    </aside>
  );
}
