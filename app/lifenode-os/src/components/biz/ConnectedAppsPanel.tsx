"use client";

import { CheckCircle2, Link2, Plus } from "lucide-react";
import { appLabelToProvider } from "@/src/lib/integrations/appProviderMap";
import type { IntegrationStatus } from "@/src/lib/integrations/types";

type Props = {
  apps: string[];
  integrations: IntegrationStatus[];
  onConnect: (appLabel: string) => void;
  /** Apps without OAuth config (Notion, WhatsApp, etc.) — mock or popup connect. */
  onConnectMock?: (appLabel: string) => void;
  onConnectMore: () => void;
};

function isAppConnected(appLabel: string, integrations: IntegrationStatus[]): boolean {
  const provider = appLabelToProvider(appLabel);
  if (!provider) return false;
  return integrations.some((i) => i.provider === provider && i.connected);
}

export default function ConnectedAppsPanel({
  apps,
  integrations,
  onConnect,
  onConnectMock,
  onConnectMore,
}: Props) {
  return (
    <div className="rounded-2xl bg-white/80 p-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Connected Apps</p>
      <div className="flex flex-col gap-2">
        {apps.length === 0 ? (
          <p className="text-xs text-slate-500">No apps in your orchestration stack yet.</p>
        ) : (
          apps.map((app) => {
            const provider = appLabelToProvider(app);
            const connected = isAppConnected(app, integrations);

            if (connected) {
              return (
                <div
                  key={app}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm font-semibold text-emerald-800"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {app} Connected
                </div>
              );
            }

            if (provider) {
              return (
                <button
                  key={app}
                  type="button"
                  onClick={() => onConnect(app)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  Connect {app}
                </button>
              );
            }

            if (onConnectMock) {
              return (
                <button
                  key={app}
                  type="button"
                  onClick={() => onConnectMock(app)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  Connect {app}
                </button>
              );
            }

            return (
              <span
                key={app}
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {app}
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  OAuth soon
                </span>
              </span>
            );
          })
        )}
      </div>
      <button
        type="button"
        onClick={onConnectMore}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
      >
        <Plus size={12} />
        Connect More Apps
      </button>
    </div>
  );
}
