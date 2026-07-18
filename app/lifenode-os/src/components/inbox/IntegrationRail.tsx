"use client";

import { Plus, Loader2, Unplug } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { startOAuthConnect } from "@/src/lib/integrations";
import { disconnectInboxProvider } from "@/src/lib/inbox/disconnectInboxProvider";
import { useConnectedApps } from "@/src/lib/useConnectedApps";
import IntegrationLogo from "./IntegrationLogo";
import type { InboxSource } from "@/src/lib/orchestrator/types";

const INBOX_APPS: {
  id: InboxSource;
  label: string;
  provider: string;
  canDisconnect: boolean;
}[] = [
  { id: "gmail", label: "Gmail", provider: "gmail", canDisconnect: true },
  { id: "slack", label: "Slack", provider: "slack", canDisconnect: true },
  {
    id: "google_calendar",
    label: "Calendar",
    provider: "google_calendar",
    canDisconnect: false,
  },
];

export default function IntegrationRail({
  className = "",
  variant = "rail",
}: {
  className?: string;
  /** Vertical sidebar on desktop; horizontal chip row on mobile. */
  variant?: "rail" | "bar";
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const { connectedApps, loading } = useConnectedApps(userId);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setConnecting(appId);
    try {
      await startOAuthConnect("INBOX", appId);
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect(appId: "gmail" | "slack", label: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Disconnect ${label} from Inbox? You can reconnect anytime.`)
    ) {
      return;
    }
    setError(null);
    setDisconnecting(appId);
    try {
      const result = await disconnectInboxProvider(appId);
      if (!result.ok) {
        setError(result.error ?? `Could not disconnect ${label}`);
      }
    } finally {
      setDisconnecting(null);
    }
  }

  const buttons = INBOX_APPS.map(({ id, label, canDisconnect }) => {
    const connected = isConnected(id);
    const busy = connecting === id || disconnecting === id;
    return (
      <div key={id} className="relative flex flex-col items-center gap-1">
        <button
          type="button"
          title={
            connected
              ? canDisconnect
                ? `${label} connected — click to reconnect`
                : `${label} connected`
              : `Connect ${label}`
          }
          aria-label={connected ? `${label} connected` : `Connect ${label}`}
          onClick={() => void handleConnect(id)}
          disabled={busy || loading}
          className={`relative flex shrink-0 items-center justify-center rounded-lg border transition ${
            variant === "bar" ? "h-8 w-8" : "h-10 w-10"
          } ${
            connected
              ? "border-emerald-300/80 bg-emerald-50"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : (
            <IntegrationLogo source={id} size={variant === "bar" ? 18 : 22} />
          )}
          {connected ? (
            <span
              className={`absolute rounded-full bg-emerald-500 ring-2 ${
                variant === "bar"
                  ? "-right-0.5 -top-0.5 h-2 w-2 ring-white"
                  : "-right-0.5 -top-0.5 h-2 w-2 ring-[#F8F8FF]"
              }`}
            />
          ) : null}
        </button>
        {connected && canDisconnect && (id === "gmail" || id === "slack") ? (
          <button
            type="button"
            title={`Disconnect ${label}`}
            aria-label={`Disconnect ${label}`}
            onClick={() => void handleDisconnect(id, label)}
            disabled={busy || loading}
            className={`inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 ${
              variant === "bar" ? "h-6 w-8" : "h-7 w-10"
            }`}
          >
            {disconnecting === id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Unplug className="h-3 w-3" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
    );
  });

  if (variant === "bar") {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div
          className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Connected apps"
          role="group"
        >
          {buttons}
        </div>
        {error ? (
          <p className="max-w-[12rem] truncate text-[10px] text-rose-600" title={error}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <aside
      className={`w-14 shrink-0 flex-col items-center gap-3 border-l border-slate-200/80 bg-[#F8F8FF] py-4 ${className}`}
      aria-label="Connected apps"
    >
      {buttons}
      {error ? (
        <p className="px-1 text-center text-[9px] leading-tight text-rose-600" title={error}>
          {error}
        </p>
      ) : null}
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
