"use client";

import Link from "next/link";
import { useState } from "react";
import { PLAN_ENTITLEMENTS } from "@/src/lib/billing/planEntitlements";
import type { BillingInterval, PaidPlanKey } from "@/src/lib/billing/plans";

async function startCheckout(plan: PaidPlanKey, interval: BillingInterval) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, interval }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    message?: string;
  };
  if (!res.ok || !data.url) {
    window.alert(data.message ?? "Checkout is not available yet.");
    return;
  }
  window.location.href = data.url;
}

const CORE = PLAN_ENTITLEMENTS.core;
const SYNC = PLAN_ENTITLEMENTS.sync;
const NEXUS = PLAN_ENTITLEMENTS.nexus;

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

type Variant = "light" | "dark";

type Props = {
  variant?: Variant;
  showHeader?: boolean;
  className?: string;
};

export default function PricingPlansSection({
  variant = "light",
  showHeader = true,
  className = "",
}: Props) {
  const [annual, setAnnual] = useState(false);
  const dark = variant === "dark";

  return (
    <section className={className}>
      {showHeader ? (
        <>
          <p
            className={`text-center text-[10px] font-bold uppercase tracking-[0.28em] ${
              dark ? "text-[#17C4B3]" : "text-teal-700"
            }`}
          >
            Pricing
          </p>
          <h2
            className={`${FONT_OUTFIT} mt-3 text-center text-3xl font-bold md:text-4xl ${
              dark ? "text-white" : "text-slate-900"
            }`}
          >
            Run your clients, business, home and health from one calm OS
          </h2>
          <p
            className={`${FONT_OUTFIT} mx-auto mt-4 max-w-2xl text-center text-sm md:text-base ${
              dark ? "text-[#4B5C71]" : "text-slate-600"
            }`}
          >
            Core is free — BizNode, VANode, and HomeNode included, with ChefNode
            recipe generation in HomeNode. Upgrade when you need more clients,
            integrations, AI, and additional Nodes.
          </p>
        </>
      ) : null}

      <div className={`${showHeader ? "mt-8" : ""} flex justify-center gap-2 text-sm`}>
        <button
          type="button"
          onClick={() => setAnnual(false)}
          className={`rounded-full px-4 py-2 font-semibold ${
            !annual
              ? dark
                ? "bg-white text-slate-900"
                : "bg-slate-900 text-white"
              : dark
                ? "bg-white/10 text-slate-300"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setAnnual(true)}
          className={`rounded-full px-4 py-2 font-semibold ${
            annual
              ? dark
                ? "bg-white text-slate-900"
                : "bg-slate-900 text-white"
              : dark
                ? "bg-white/10 text-slate-300"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          Annual
        </button>
      </div>
      {annual ? (
        <p
          className={`mt-2 text-center text-xs ${
            dark ? "text-slate-500" : "text-slate-500"
          }`}
        >
          Save 2 months with annual billing.
        </p>
      ) : null}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <PlanCard
          variant={variant}
          name={CORE.displayName}
          price={0}
          annual={annual}
          tagline="BizNode + VANode + HomeNode. No card required."
          ctaLabel="Start free"
          ctaHref="/auth/signup"
          features={[
            "Whiteboard",
            "ChefNode in HomeNode · 2 recipe generations / month",
            "3 LifePulse trackers",
            "2 VANode clients",
            "2 invoices · 2 EOD reports · 2 transcriptions",
            "1 kanban board · 2 integrations",
            "20 AI credits / day",
          ]}
        />
        <PlanCard
          variant={variant}
          name={SYNC.displayName}
          price={annual ? 19 : 24}
          annual={annual}
          highlight
          tagline="Add VitalNode, logic bridges, and daily AI for operators."
          ctaLabel="Get Sync"
          onCta={() => void startCheckout("sync", annual ? "annual" : "monthly")}
          features={[
            "Everything in Core",
            "VitalNode unlocked",
            "ChefNode in HomeNode · 20 recipe generations / month",
            "8 clients · 12 integrations · 40 trackers",
            "20 invoices · 20 EOD reports · 20 transcriptions / month",
            "10 kanban boards",
            "150 AI credits / day",
            "Logic bridges & Linos alerts",
          ]}
        />
        <PlanCard
          variant={variant}
          name={NEXUS.displayName}
          price={annual ? 39 : 49}
          annual={annual}
          tagline="All six Nodes and generous daily AI for power users."
          ctaLabel="Get Nexus"
          onCta={() => void startCheckout("nexus", annual ? "annual" : "monthly")}
          features={[
            "Everything in Sync",
            "TraderNode + ProNode",
            "ChefNode in HomeNode · 40 recipe generations / month",
            "Unlimited clients & integrations",
            "Unlimited invoices, EOD reports & transcriptions / month",
            "1,000 AI credits / day (fair use)",
            "Priority support",
          ]}
        />
      </div>

      <p
        className={`mt-10 text-center text-xs ${
          dark ? "text-slate-500" : "text-slate-500"
        }`}
      >
        Prices in USD. Taxes at checkout.{" "}
        <Link
          href="/terms"
          className={`underline ${dark ? "hover:text-slate-300" : ""}`}
        >
          Terms
        </Link>
      </p>
    </section>
  );
}

function PlanCard({
  variant,
  name,
  price,
  annual,
  tagline,
  features,
  ctaLabel,
  ctaHref,
  onCta,
  highlight,
}: {
  variant: Variant;
  name: string;
  price: number;
  annual: boolean;
  tagline: string;
  features: string[];
  ctaLabel: string;
  ctaHref?: string;
  onCta?: () => void;
  highlight?: boolean;
}) {
  const dark = variant === "dark";

  return (
    <div
      className={`${FONT_OUTFIT} rounded-2xl border p-6 ${
        highlight
          ? dark
            ? "border-teal-500/60 bg-white/[0.04] shadow-lg ring-1 ring-teal-500/30"
            : "border-teal-500 bg-white shadow-lg ring-1 ring-teal-500/30"
          : dark
            ? "border-slate-800 bg-slate-900/60"
            : "border-slate-200 bg-white"
      }`}
    >
      {highlight ? (
        <p
          className={`text-[10px] font-bold uppercase tracking-wider ${
            dark ? "text-teal-400" : "text-teal-700"
          }`}
        >
          Most popular
        </p>
      ) : null}
      <h3
        className={`mt-1 text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}
      >
        {name}
      </h3>
      <p className={`mt-3 text-3xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
        ${price}
        <span
          className={`text-sm font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}
        >
          {price === 0 ? "" : annual ? " / mo billed yearly" : " / mo"}
        </span>
      </p>
      <p className={`mt-2 text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
        {tagline}
      </p>
      <ul className={`mt-5 space-y-2 text-sm ${dark ? "text-slate-300" : "text-slate-700"}`}>
        {features.map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
            dark
              ? "bg-white text-slate-900 hover:bg-slate-100"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {ctaLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onCta}
          className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
            dark
              ? "bg-teal-500 text-white hover:bg-teal-400"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
