"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LogIn, Clock } from "lucide-react";

type Props = {
  /** App name to display in the title + body (e.g. "Google Calendar"). Open when truthy. */
  app: string | null;
  /** Short description of what the Node will use the app for. */
  reason?: string;
  /** Hex/Tailwind color seed for the primary button (defaults to slate-900). */
  accent?: string;
  /** What the parent Node calls itself (e.g. "HomeNode"). Optional, used in the body copy. */
  nodeLabel?: string;
  /**
   * Optional decoration (e.g. an icon component) rendered above the title.
   */
  decoration?: ReactNode;
  /** Confirm — user wants to log in to the app now. */
  onLogin: () => void;
  /** Later — keep the app selected but don't open the OAuth flow. */
  onLater: () => void;
};

/**
 * Reusable connect-app confirmation. Renders the standard
 * "Connect <App>" dialog used across every Node's stack-sync step.
 *
 * Portaled to `document.body` at `z-[130]` so it stacks above ProNode
 * discovery focus mode (`z-[110]`), Linos Assistant, and nav chrome.
 */
export default function ConnectAppDialog({
  app,
  reason,
  accent,
  nodeLabel,
  decoration,
  onLogin,
  onLater,
}: Props) {
  if (!app || typeof document === "undefined") return null;
  const body =
    reason ??
    (nodeLabel
      ? `Please log in to ${app} so ${nodeLabel} can pull your data and keep this dashboard in sync.`
      : `Please log in to ${app} so LifeNode OS can pull your data and keep this dashboard in sync.`);
  const accentStyle = accent
    ? { backgroundColor: accent }
    : undefined;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-app-title"
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-800 shadow-2xl">
        {decoration ? <div className="mb-3">{decoration}</div> : null}
        <h3 id="connect-app-title" className="text-lg font-bold text-slate-900">
          Connect {app}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onLater}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <Clock className="h-3.5 w-3.5" />
            Log in later
          </button>
          <button
            type="button"
            onClick={onLogin}
            style={accentStyle}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md transition hover:opacity-95 ${
              accent ? "" : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Log in
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
