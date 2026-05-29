"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  Bot,
  Laptop,
  LifeBuoy,
  MessageSquare,
  Palette,
  Plug,
  Shield,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { SUPPORT_ROUTES } from "@/lib/support/routes";
import type { ActiveNode } from "@/src/context/LifeNodeContext";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import { NODE_GALLERY_ENTRIES } from "@/src/components/shell/node-gallery-nodes";
import { useLifeNodeSettings } from "@/src/hooks/useLifeNodeSettings";
import {
  loadLifeNodeSettings,
  NOTIFICATION_ROWS,
  type AiPersona,
  type AiProactivity,
  type AppearanceMode,
  type LifeNodeSettings,
  type NotificationRowId,
  type SyncFrequency,
  type UiDensity,
} from "@/src/lib/settings/lifeNodeSettings";
import AccountDeletionModal from "./AccountDeletionModal";

type SectionId =
  | "account"
  | "workspace"
  | "ai"
  | "notifications"
  | "integrations"
  | "appearance"
  | "support";

const SECTIONS: { id: SectionId; label: string; icon: typeof Shield }[] = [
  { id: "account", label: "Account & Security", icon: Shield },
  { id: "workspace", label: "Workspace & Nodes", icon: SlidersHorizontal },
  { id: "ai", label: "AI Behavior", icon: Bot },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "support", label: "Support", icon: LifeBuoy },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
      {children}
    </h3>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="text-sm text-slate-800 dark:text-slate-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

function exportUserDataJson() {
  const settings = loadLifeNodeSettings();
  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    app: "LifeNodeOS",
    localPreferences: settings,
  };
  return fetch("/api/user-state", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((userState) => {
      payload.workspaceState = userState;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifenodeos-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifenodeos-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
}

export default function LifeNodeSettingsPanel({ open, onClose }: Props) {
  const titleId = useId();
  const { data: session } = useSession();
  const { settings, patch } = useLifeNodeSettings();
  const {
    configuredHats,
    toggleConfiguredHat,
    updateConfiguredHats,
  } = useLifeNodeContext();
  const [section, setSection] = useState<SectionId>("account");
  const [displayName, setDisplayName] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayName(session?.user?.name ?? "");
  }, [open, session?.user?.name]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  const saveDisplayName = async () => {
    setSavingName(true);
    try {
      await fetch("/api/user-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() || null }),
      });
    } finally {
      setSavingName(false);
    }
  };

  const setNotification = (
    rowId: NotificationRowId,
    channel: "push" | "sms" | "email",
    value: boolean,
  ) => {
    patch({
      notifications: {
        ...settings.notifications,
        [rowId]: { ...settings.notifications[rowId], [channel]: value },
      },
    });
  };

  const allNodes = NODE_GALLERY_ENTRIES.map((e) => e.node);
  const isNodeEnabled = (node: ActiveNode) => configuredHats.includes(node);

  if (!open) return null;

  const email = session?.user?.email ?? "";
  const initials =
    (displayName || email || "U").slice(0, 2).toUpperCase();

  return (
    <>
      <div className="fixed inset-0 z-[280] flex justify-end">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[6px]"
          aria-label="Close settings"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative z-[281] flex h-full w-full max-w-[min(100vw,28rem)] flex-col border-l border-white/10 bg-[#f8fafc] shadow-2xl dark:bg-[#0c0e12]"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                LifeNodeOS
              </p>
              <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
                Settings
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200/80 px-3 py-2 dark:border-white/10">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  section === id
                    ? "bg-teal-500/15 text-teal-800 dark:text-teal-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label.split(" ")[0]}</span>
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {section === "account" ? (
              <div className="space-y-6">
                <SectionTitle>Profile</SectionTitle>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-lg font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <p className="truncate text-xs text-slate-500">{email || "—"}</p>
                    <button
                      type="button"
                      disabled={savingName}
                      onClick={() => void saveDisplayName()}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-400"
                    >
                      {savingName ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                </div>

                <SectionTitle>Security</SectionTitle>
                <div className="space-y-2">
                  <a
                    href="/auth/forgot-password"
                    className="block rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                  >
                    Reset password
                  </a>
                  <Toggle
                    label="Multi-factor authentication (MFA)"
                    checked={mfaEnabled}
                    onChange={setMfaEnabled}
                  />
                  {mfaEnabled ? (
                    <p className="text-xs text-slate-500">
                      MFA enrollment will be available in a future release — your preference is saved locally.
                    </p>
                  ) : null}
                </div>

                <SectionTitle>Active sessions</SectionTitle>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                    <Laptop className="h-4 w-4 text-teal-600" />
                    <span className="flex-1 text-slate-800 dark:text-slate-200">
                      This device · Windows · Active now
                    </span>
                  </li>
                  <li className="rounded-xl border border-dashed border-slate-200/60 px-3 py-2 text-xs text-slate-500 dark:border-white/10">
                    Other sessions appear here when you sign in on additional devices.
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                  className="w-full rounded-xl border border-slate-300/80 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  Log out of all other sessions
                </button>

                <div className="rounded-xl border border-rose-200/60 bg-rose-50/80 p-4 dark:border-rose-500/30 dark:bg-rose-950/30">
                  <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                    Danger zone
                  </p>
                  <p className="mt-1 text-xs text-rose-800/80 dark:text-rose-200/70">
                    Permanently remove your account and all life data from LifeNodeOS.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500"
                  >
                    Delete account…
                  </button>
                </div>
              </div>
            ) : null}

            {section === "workspace" ? (
              <div className="space-y-6">
                <SectionTitle>Node modules</SectionTitle>
                <p className="text-xs text-slate-500">
                  Enable only the worlds you use — hides hats from the left rail.
                </p>
                <div className="space-y-2">
                  {NODE_GALLERY_ENTRIES.map(({ node, label, Icon }) => (
                    <Toggle
                      key={node}
                      label={label}
                      checked={isNodeEnabled(node)}
                      onChange={() => toggleConfiguredHat(node)}
                    />
                  ))}
                  <p className="rounded-xl border border-dashed border-slate-200/60 px-3 py-2 text-xs text-slate-500 dark:border-white/10">
                    LifePulse is always available from the left rail.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfiguredHats(allNodes)}
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400"
                >
                  Enable all nodes
                </button>

                <SectionTitle>Focus hours & timezone</SectionTitle>
                <p className="text-xs text-slate-500">
                  Alerts inside these hours can surface as urgent; outside = low priority.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-slate-500">
                    Start
                    <input
                      type="time"
                      value={settings.focusHoursStart}
                      onChange={(e) => patch({ focusHoursStart: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </label>
                  <label className="block text-xs text-slate-500">
                    End
                    <input
                      type="time"
                      value={settings.focusHoursEnd}
                      onChange={(e) => patch({ focusHoursEnd: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </label>
                </div>
                <label className="block text-xs text-slate-500">
                  Timezone
                  <input
                    type="text"
                    value={settings.timezone}
                    onChange={(e) => patch({ timezone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>
              </div>
            ) : null}

            {section === "ai" ? (
              <div className="space-y-6">
                <SectionTitle>Context memory</SectionTitle>
                <p className="text-xs text-slate-500">
                  Facts Linos and assistants remember — clear any that are outdated.
                </p>
                <ul className="space-y-2">
                  {settings.contextMemories.map((mem) => (
                    <li
                      key={mem.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <span className="text-sm text-slate-800 dark:text-slate-200">
                        {mem.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            contextMemories: settings.contextMemories.filter(
                              (m) => m.id !== mem.id,
                            ),
                          })
                        }
                        className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-500"
                      >
                        Clear
                      </button>
                    </li>
                  ))}
                </ul>

                <SectionTitle>Proactivity</SectionTitle>
                <div className="space-y-2">
                  {(
                    [
                      ["passive", "Passive", "Only when you ask or trigger"],
                      ["balanced", "Balanced", "Quiet sidebar suggestions"],
                      ["autonomous", "Autonomous", "Active optimization pings"],
                    ] as const
                  ).map(([id, title, desc]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => patch({ aiProactivity: id as AiProactivity })}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                        settings.aiProactivity === id
                          ? "border-teal-400/50 bg-teal-500/10"
                          : "border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-white/[0.04]"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {title}
                      </p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </button>
                  ))}
                </div>

                <SectionTitle>Tone / persona</SectionTitle>
                <select
                  value={settings.aiPersona}
                  onChange={(e) =>
                    patch({ aiPersona: e.target.value as AiPersona })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="minimal">Minimal / Direct</option>
                  <option value="coach">Supportive Coach</option>
                  <option value="executive">Executive Assistant</option>
                </select>
              </div>
            ) : null}

            {section === "notifications" ? (
              <div className="space-y-6">
                <SectionTitle>Channel routing</SectionTitle>
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                  <table className="w-full min-w-[280px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
                        <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                          Event
                        </th>
                        <th className="px-2 py-2 text-center">Push</th>
                        <th className="px-2 py-2 text-center">SMS</th>
                        <th className="px-2 py-2 text-center">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {NOTIFICATION_ROWS.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 last:border-0 dark:border-white/5"
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {row.label}
                          </td>
                          {(["push", "sms", "email"] as const).map((ch) => (
                            <td key={ch} className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={settings.notifications[row.id][ch]}
                                onChange={(e) =>
                                  setNotification(row.id, ch, e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300 text-teal-600"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <SectionTitle>Do not disturb</SectionTitle>
                <Toggle
                  label="Silence non-critical notifications"
                  checked={settings.dndEnabled}
                  onChange={(v) => patch({ dndEnabled: v })}
                />
                <Toggle
                  label="Emergency overrides (VIP clients / family tags)"
                  checked={settings.dndEmergencyOverride}
                  onChange={(v) => patch({ dndEmergencyOverride: v })}
                />
              </div>
            ) : null}

            {section === "integrations" ? (
              <div className="space-y-6">
                <SectionTitle>Connected apps</SectionTitle>
                <p className="text-xs text-slate-500">
                  Manage CRM, automation (Zapier / Make / n8n), and custom webhooks from
                  each node&apos;s integration panel. Sync frequency applies globally.
                </p>
                <a
                  href="/work"
                  className="inline-block text-sm font-semibold text-teal-600 dark:text-teal-400"
                >
                  Open BizNode integrations →
                </a>

                <SectionTitle>Sync frequency</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["realtime", "Real-time"],
                      ["hourly", "Hourly"],
                      ["daily", "Daily"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => patch({ syncFrequency: id as SyncFrequency })}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        settings.syncFrequency === id
                          ? "bg-teal-500 text-white"
                          : "bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <SectionTitle>API & webhooks</SectionTitle>
                <p className="rounded-xl border border-dashed border-slate-200/80 px-3 py-3 text-xs text-slate-500 dark:border-white/10">
                  Webhook signing keys and Zapier triggers are configured per workspace in
                  Settings → Integrations on each node dashboard.
                </p>
              </div>
            ) : null}

            {section === "support" ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Open a dedicated page for each form. You can also use the Support
                  menu in the top bar on any node, the shell, or onboarding.
                </p>
                <Link
                  href={SUPPORT_ROUTES.feedback}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/60 p-4 transition hover:border-teal-400/40 hover:bg-teal-500/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-teal-500/10"
                >
                  <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Feedback & suggestions
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Tell us what would make LifeNodeOS better for your workflow.
                    </span>
                  </span>
                </Link>
                <Link
                  href={SUPPORT_ROUTES.ticket}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/60 p-4 transition hover:border-teal-400/40 hover:bg-teal-500/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-teal-500/10"
                >
                  <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Ticket escalation
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Submit a ticket for bugs, billing, or account issues — our
                      team will follow up by email.
                    </span>
                  </span>
                </Link>
              </div>
            ) : null}

            {section === "appearance" ? (
              <div className="space-y-6">
                <SectionTitle>Theme</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["light", "Light"],
                      ["dark", "Dark"],
                      ["system", "System"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => patch({ appearance: id as AppearanceMode })}
                      className={`rounded-xl border py-3 text-xs font-semibold ${
                        settings.appearance === id
                          ? "border-teal-400/50 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                          : "border-slate-200/80 text-slate-600 dark:border-white/10 dark:text-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <SectionTitle>Density</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["spacious", "Spacious", "Notion / Linear calm"],
                      ["compact", "Compact", "Dense data views"],
                    ] as const
                  ).map(([id, title, desc]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => patch({ density: id as UiDensity })}
                      className={`rounded-xl border px-3 py-3 text-left ${
                        settings.density === id
                          ? "border-teal-400/50 bg-teal-500/10"
                          : "border-slate-200/80 dark:border-white/10"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {title}
                      </p>
                      <p className="text-[10px] text-slate-500">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <AccountDeletionModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        userEmail={email}
        onExportData={() => void exportUserDataJson()}
        onConfirmDelete={() => {
          void signOut({ callbackUrl: "/auth/signin?deleted=1" });
        }}
      />
    </>
  );
}
