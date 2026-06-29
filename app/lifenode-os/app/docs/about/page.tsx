import Link from "next/link";
import DocsPageShell from "@/components/docs/DocsPageShell";
import { DOC_ROUTES } from "@/lib/docs/routes";

export const metadata = {
  title: "About LifeNode OS | Documentation",
  description:
    "LifeNode OS was created by Ann Custodio — Dynamic Automation Specialist, GHL Expert, and vibe-coder building one dashboard for every hat you wear.",
};

export default function AboutDocsPage() {
  return (
    <DocsPageShell>
      <header className="mb-12 border-b border-slate-800 pb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">
          LifeNode OS
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white">
          About LifeNode OS
        </h1>
        <p className="text-slate-400">
          One operating system for the many roles you play — built by an operator
          who lives inside CRMs, automations, and client workflows every day.
        </p>
      </header>

      <div className="space-y-12 leading-relaxed text-slate-300">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Created by</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <p className="text-lg font-semibold text-white">Ann Custodio</p>
            <p className="mt-1 text-sm text-cyan-300/90">
              Dynamic Automation Specialist · GHL Expert · Vibe-Coder
            </p>
            <p className="mt-4 text-slate-400">
              Ann brings over eight years of foundational experience across
              customer service, sales, and executive virtual assistance. She
              specializes in translating real business operations into
              high-efficiency automated ecosystems using AI, GoHighLevel, and
              modern integration workflows.
            </p>
            <p className="mt-4 text-slate-400">
              Her focus is optimizing lead generation, CRM pipelines, and client
              engagement for high-growth sectors — especially residential home
              services and construction — where speed, clarity, and follow-through
              win deals.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Why LifeNode OS exists
          </h2>
          <p>
            Most people do not live in a single job title. You might run a
            business, support clients as a VA, manage a household, track health
            goals, trade markets, or hold sensitive professional work — often in
            the same week.
          </p>
          <p>
            LifeNode OS turns those contexts into <strong className="text-slate-200">nodes</strong>:
            focused workspaces inside one shell. Instead of juggling disconnected
            apps, you pick your hats once and LifeNode assembles the right
            surfaces — pipelines, EOD logs, grocery lists, wellness trackers, and
            secure vaults — around how you actually work.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Who it is for</h2>
          <ul className="list-disc space-y-3 pl-5 marker:text-slate-600">
            <li>
              <strong className="text-slate-200">Operators &amp; founders</strong>{" "}
              — BizNode for triage, pipelines, and connected business apps.
            </li>
            <li>
              <strong className="text-slate-200">Virtual assistants &amp; agencies</strong>{" "}
              — VANode for clients, EOD reports, invoicing, and billable hours.
            </li>
            <li>
              <strong className="text-slate-200">Households</strong> — HomeNode
              for groceries, chores, meal planning, and ChefNode recipes.
            </li>
            <li>
              <strong className="text-slate-200">Wellness-focused users</strong>{" "}
              — VitalNode for momentum, sleep, and scheduling (Sync+).
            </li>
            <li>
              <strong className="text-slate-200">Markets &amp; deep work</strong>{" "}
              — TraderNode and ProNode for journals, risk guardrails, and secure
              case-style vaults (plan-gated).
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            The LifeNode philosophy
          </h2>
          <p>
            Ann built LifeNode OS the same way she builds client automations in
            GoHighLevel: start from the workflow, remove friction, and let AI
            assist where it saves time — never where it replaces judgment. Linos,
            the in-app assistant, helps summarize, draft, and triage inside your
            existing data rather than sending you to yet another chat window.
          </p>
          <p>
            The product is actively evolving. Feedback from real operators shapes
            the roadmap — especially integrations with stable OAuth and clear
            demand from VA and home-services workflows.
          </p>
        </section>

        <section className="space-y-4 border-t border-slate-800 pt-10">
          <h2 className="text-xl font-semibold text-white">Continue reading</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <Link
                href={DOC_ROUTES.guide}
                className="text-teal-400 hover:underline"
              >
                User guide — how to use each node and feature
              </Link>
            </li>
            <li>
              <Link
                href={DOC_ROUTES.platform}
                className="text-teal-400 hover:underline"
              >
                Platform &amp; tools — how we build and integrate
              </Link>
            </li>
            <li>
              <Link
                href={DOC_ROUTES.security}
                className="text-teal-400 hover:underline"
              >
                Security — how your data is protected
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </DocsPageShell>
  );
}
