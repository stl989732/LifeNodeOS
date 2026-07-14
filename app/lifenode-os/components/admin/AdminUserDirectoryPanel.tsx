"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminUserRecord,
  AdminUserSegment,
} from "@/src/lib/admin/getAdminUserDirectory";

const SEGMENT_COPY: Record<
  AdminUserSegment,
  { title: string; description: string }
> = {
  registered: {
    title: "All registered accounts",
    description:
      "Every Supabase Auth account with email, signup method, and connected tools.",
  },
  active: {
    title: "Active accounts",
    description:
      "Registered users who have not been tombstoned — best list for marketing outreach.",
  },
  deleted: {
    title: "Deleted accounts",
    description: "Users who completed account deletion (deleted_account_ids).",
  },
  subscriptions: {
    title: "Subscription rows",
    description:
      "Billing records with plan and status for accounts that have an email.",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

type Props = {
  segment: AdminUserSegment;
  onClose: () => void;
};

export default function AdminUserDirectoryPanel({ segment, onClose }: Props) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?segment=${segment}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load user list");
      const data = (await res.json()) as { users: AdminUserRecord[] };
      setUsers(data.users ?? []);
    } catch {
      setError("Could not load accounts for this segment.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [segment]);

  useEffect(() => {
    void load();
  }, [load]);

  const emails = users
    .map((u) => u.email?.trim())
    .filter((e): e is string => Boolean(e));

  const copyEmails = async () => {
    if (!emails.length) return;
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const meta = SEGMENT_COPY[segment];

  return (
    <section className="mb-8 rounded-2xl border-2 border-teal-300/80 bg-white/90 p-6 shadow-md backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{meta.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyEmails()}
            disabled={!emails.length}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-40"
          >
            {copied ? "Copied!" : `Copy ${emails.length} email(s)`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-rose-700">{error}</p>
      ) : loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading accounts…</p>
      ) : users.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No accounts in this segment.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50/90">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Signed up</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Sign-in</th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Connected tools
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((user) => {
                const tools = [
                  ...user.connectedIntegrations,
                  ...user.connectedApps.map((a) => a.replace(/_/g, " ")),
                ];
                const uniqueTools = [...new Set(tools)];

                return (
                  <tr key={user.userId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.email ? (
                        <a
                          href={`mailto:${user.email}`}
                          className="text-teal-800 underline-offset-2 hover:underline"
                        >
                          {user.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">No email</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {user.displayName ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDate(user.signedUpAt)}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {user.effectivePlan ?? "core"}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {user.subscriptionStatus?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.authProviders.length
                        ? user.authProviders.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {uniqueTools.length ? uniqueTools.join(", ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
