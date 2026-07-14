"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminTrendPoint } from "@/src/lib/admin/getAdminDashboardStats";

type Props = {
  trends: AdminTrendPoint[];
};

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminTrendsCharts({ trends }: Props) {
  const latest = trends[trends.length - 1];
  const hasData = trends.some((p) => p.users > 0 || p.earnings > 0);

  return (
    <section className="mb-8 space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Growth &amp; earnings
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Last 12 months — cumulative registered users and estimated monthly
              recurring revenue from Sync ($24) and Nexus ($59) list prices.
              Actual Lemon receipts may differ for annual billing and discounts.
            </p>
          </div>
          {latest ? (
            <div className="flex flex-wrap gap-4 text-right">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Users (latest)
                </p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {latest.users}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Est. MRR
                </p>
                <p className="text-2xl font-bold tabular-nums text-teal-800">
                  {usd(latest.earnings)}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {!hasData ? (
          <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500">
            No trend data yet — charts fill in as users register and paid
            subscriptions appear.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-sky-50/80 to-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Registered users over time
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trends}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                      formatter={(value: number | string, name: string) => [
                        value,
                        name === "users" ? "Total users" : "New that month",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value) =>
                        value === "users" ? "Total users" : "New signups"
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      name="users"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#2563eb" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      name="newUsers"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#16a34a" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-amber-50/60 to-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Estimated earnings (MRR)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trends}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      width={48}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                      formatter={(value: number | string, name: string) => [
                        typeof value === "number" && name === "earnings"
                          ? usd(value)
                          : value,
                        name === "earnings" ? "Est. MRR" : "Paid subs",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value) =>
                        value === "earnings" ? "Est. MRR ($)" : "Paid subscriptions"
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      name="earnings"
                      stroke="#dc2626"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#dc2626" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="paidSubs"
                      name="paidSubs"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#7c3aed" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
