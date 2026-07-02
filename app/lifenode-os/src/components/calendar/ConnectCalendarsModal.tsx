"use client";

import { Loader2, X } from "lucide-react";
import {
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_TEXT,
} from "@/src/components/lifePulse/lifePulseAura";
import type { CalendarIntegration } from "@/src/lib/calendar/types";

type ConnectCalendarsModalProps = {
  open: boolean;
  integrations: CalendarIntegration[];
  connectingId: string | null;
  disconnectingId: string | null;
  onClose: () => void;
  onConnect: (row: CalendarIntegration) => void;
  onDisconnect: (row: CalendarIntegration) => void;
};

export default function ConnectCalendarsModal({
  open,
  integrations,
  connectingId,
  disconnectingId,
  onClose,
  onConnect,
  onDisconnect,
}: ConnectCalendarsModalProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close connect calendars dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-calendars-title"
        className={`fixed left-1/2 top-1/2 z-[201] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 ${AURA_GLASS_CLASS} p-5 shadow-2xl`}
        style={AURA_GLASS_STYLE}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="connect-calendars-title"
              className={`text-lg font-bold ${AURA_TEXT.title}`}
            >
              Connect Calendars & Schedulers
            </h2>
            <p className={`mt-1 text-xs ${AURA_TEXT.muted}`}>
              Google Calendar syncs events into your dashboard. Other tools save
              your connection until OAuth goes live.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-500 hover:bg-white/60 hover:text-slate-900"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="max-h-[min(60vh,24rem)] space-y-2 overflow-y-auto">
          {integrations.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/30 bg-white/25 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {row.label}
                </p>
                <p className="truncate text-[11px] text-slate-600">
                  {row.description}
                </p>
              </div>
              <button
                type="button"
                disabled={
                  connectingId === row.id ||
                  disconnectingId === row.id ||
                  (!row.connected && connectingId !== null)
                }
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-default ${
                  row.connected
                    ? "border border-rose-500/50 bg-rose-50 text-rose-900 hover:bg-rose-100"
                    : "border border-slate-400/80 bg-white text-slate-900 shadow-sm hover:border-teal-600 hover:bg-teal-50"
                }`}
                onClick={() =>
                  row.connected ? onDisconnect(row) : onConnect(row)
                }
              >
                {connectingId === row.id ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Connecting…
                  </span>
                ) : disconnectingId === row.id ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Disconnecting…
                  </span>
                ) : row.connected ? (
                  "Disconnect"
                ) : (
                  "Connect"
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
