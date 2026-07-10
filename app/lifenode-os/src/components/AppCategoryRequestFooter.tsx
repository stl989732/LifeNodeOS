"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { SendHorizontal, X } from "lucide-react";

type Variant = "light" | "dark" | "glass" | "inverted";

type Props = {
  /** Category label shown in the request (e.g. "PM / Creative ops"). */
  category: string;
  /** Node hat name for routing (e.g. "VitalNode"). */
  nodeLabel: string;
  variant?: Variant;
  className?: string;
};

const VARIANT_STYLES: Record<
  Variant,
  { wrap: string; text: string; button: string; modal?: string }
> = {
  light: {
    wrap: "mt-3 border-t border-slate-200/80 pt-3",
    text: "text-[11px] leading-relaxed text-slate-500",
    button:
      "font-semibold text-[#1E293B] underline decoration-slate-300 underline-offset-2 hover:decoration-[#1E293B]",
  },
  dark: {
    wrap: "mt-3 border-t border-white/10 pt-3",
    text: "text-[11px] leading-relaxed text-slate-400",
    button:
      "font-semibold text-cyan-200 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-100",
  },
  glass: {
    wrap: "mt-3 border-t border-white/40 pt-3",
    text: "text-[11px] leading-relaxed text-slate-600",
    button:
      "font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-900",
  },
  inverted: {
    wrap: "mt-3 border-t border-zinc-700 pt-3",
    text: "text-[11px] leading-relaxed text-zinc-500",
    button:
      "font-semibold text-[#06B6D4] underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-300",
  },
};

export default function AppCategoryRequestFooter({
  category,
  nodeLabel,
  variant = "light",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [sent, setSent] = useState(false);
  const styles = VARIANT_STYLES[variant];

  const close = useCallback(() => {
    setOpen(false);
    setSent(false);
    setAppName("");
  }, []);

  const submit = useCallback(() => {
    const name = appName.trim() || "Unnamed app";
    const subject = encodeURIComponent(
      `LifeNode OS app request — ${nodeLabel} / ${category}`,
    );
    const body = encodeURIComponent(
      `Please add this app to LifeNode OS.\n\nApp: ${name}\nCategory: ${category}\nNode: ${nodeLabel}\n`,
    );
    window.location.href = `mailto:support@los.lifenodeos.com?subject=${subject}&body=${body}`;
    setSent(true);
    window.setTimeout(close, 1400);
  }, [appName, category, close, nodeLabel]);

  return (
    <>
      <div className={`${styles.wrap} ${className}`}>
        <p className={styles.text}>
          Unable to find the app?{" "}
          <button type="button" onClick={() => setOpen(true)} className={styles.button}>
            Request an app
          </button>{" "}
          and we&apos;ll check if we can add it to this category.
        </p>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              role="presentation"
              className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) close();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="app-request-title"
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {nodeLabel}
                    </p>
                    <h3 id="app-request-title" className="text-lg font-bold text-slate-900">
                      Request an app
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {sent ? (
                  <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                    Thanks — your email client should open with the request. We&apos;ll review it
                    soon.
                  </p>
                ) : (
                  <>
                    <label className="block text-xs font-semibold text-slate-700">
                      App name
                      <input
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        placeholder="e.g. Acme CRM"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none ring-indigo-400/30 focus:ring-2"
                        autoFocus
                      />
                    </label>
                    <p className="mt-2 text-[11px] text-slate-500">
                      We&apos;ll email your request to the LifeNode OS team and follow up if we can
                      onboard the integration.
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={close}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submit}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E293B] px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        <SendHorizontal className="h-4 w-4" />
                        Send request
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
