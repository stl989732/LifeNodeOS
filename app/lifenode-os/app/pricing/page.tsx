"use client";

import PricingPlansSection from "@/src/components/billing/PricingPlansSection";
import DashboardReturnNav from "@/src/components/DashboardReturnNav";
import Link from "next/link";
import Image from "next/image";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-slate-900/95 to-[#0B0F17] px-4 py-16 text-slate-50">
      <header className="mx-auto mb-10 flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/lifenode-os-logo.png"
            alt="LifeNode OS"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
            unoptimized
          />
          <span className="text-center font-bold tracking-wide text-xl text-white">
            LifeNode <span className="font-light text-slate-400">OS</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <DashboardReturnNav linkClassName="text-slate-300 transition hover:text-white" />
          <Link href="/catalog" className="text-slate-300 transition hover:text-white">
            Full Catalog
          </Link>
          <Link
            href="/auth/signin"
            className="text-center text-slate-300 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-white px-4 py-2 text-center text-slate-900 transition hover:bg-slate-100"
          >
            Sign up
          </Link>
        </nav>
      </header>
      <div className="mx-auto max-w-5xl">
        <PricingPlansSection variant="dark" />
      </div>
    </main>
  );
}
