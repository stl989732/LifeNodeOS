import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function loadShare(token: string) {
  const base =
    process.env.AUTH_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:3000";
  const res = await fetch(
    `${base}/api/vanode/billable-sessions/share/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return res.json() as Promise<{
    clientName: string;
    workDate: string;
    status: string;
    activeTime: string;
    activeHoursDecimal: string;
    breakTime: string;
    immutable: boolean;
  }>;
}

export default async function BillableTimeSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await loadShare(token);
  if (!data) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">
          LifeNode · Billable hours
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">
          {data.clientName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{data.workDate}</p>
        <dl className="mt-8 space-y-4">
          <div>
            <dt className="text-xs font-bold uppercase text-slate-500">
              Active time
            </dt>
            <dd className="text-3xl font-bold tabular-nums text-slate-900">
              {data.activeTime}
              <span className="ml-2 text-base font-semibold text-slate-500">
                ({data.activeHoursDecimal} hrs)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-500">
              Break time
            </dt>
            <dd className="text-lg font-semibold text-slate-700">
              {data.breakTime}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-500">
              Status
            </dt>
            <dd className="text-sm capitalize text-slate-700">{data.status}</dd>
          </div>
        </dl>
        {data.immutable ? (
          <p className="mt-8 text-xs text-slate-400">
            This log is read-only. Times are recorded automatically in LifeNode
            VANode and cannot be edited.
          </p>
        ) : null}
      </div>
    </main>
  );
}
