import Link from "next/link";
import DocsPageShell from "@/components/docs/DocsPageShell";
import { DOC_ROUTES } from "@/lib/docs/routes";

export const metadata = {
  title: "Platform & Tools | LifeNode OS Documentation",
  description:
    "Technologies and workflows behind LifeNode OS — Next.js, Supabase, Vercel, AI-assisted development, and integrations.",
};

const STACK_GROUPS = [
  {
    title: "Application & UI",
    items: [
      "Next.js 16 (App Router) — routing, API routes, and server rendering",
      "React 19 — interactive dashboards, nodes, and shell UI",
      "TypeScript — type-safe features across the codebase",
      "Tailwind CSS 4 — responsive layout for desktop and mobile browsers",
      "TipTap — rich text in ProNode and document-style editors",
      "Lucide React — consistent iconography across nodes",
    ],
  },
  {
    title: "Data & authentication",
    items: [
      "Supabase (PostgreSQL) — user shell state, widgets, trackers, integrations, and node-specific tables",
      "Row Level Security (RLS) — per-user data isolation at the database layer",
      "NextAuth v5 — sessions, Google OAuth, and credential sign-in",
      "bcrypt — hashed passwords and security-question answers for account recovery",
    ],
  },
  {
    title: "Hosting, observability & billing",
    items: [
      "Vercel — production hosting, preview deploys, and edge delivery",
      "Sentry — error monitoring and performance traces in production",
      "Vercel Speed Insights — real-user performance signals",
      "Lemon Squeezy — subscription checkout, webhooks, and customer portal",
      "Termly — consent management and policy embeds on public pages",
    ],
  },
  {
    title: "Integrations & AI",
    items: [
      "OAuth connectors — Gmail, Slack, Google Calendar, and selected health and business tools",
      "Server-side token storage — integration credentials never ship to the browser",
      "Linos — in-app AI assistant for summaries, drafts, and tracker chat (plan-metered)",
      "ChefNode — AI recipe discovery and meal planning in HomeNode",
    ],
  },
] as const;

const BUILD_WORKFLOW = [
  {
    title: "Design from real workflows",
    body: "Features start from operator pain points — VA EOD logs, BizNode triage, household grocery sync — not abstract dashboards. Ann's GHL and automation background informs what ships first.",
  },
  {
    title: "AI-assisted development (vibe-coding)",
    body: "Cursor and agent skills accelerate implementation while human review keeps data migrations additive, storage keys stable, and billing gates aligned with plan entitlements.",
  },
  {
    title: "Integrate with MCP & docs tooling",
    body: "Supabase MCP for schema checks and logs, Context7 for framework docs, Sentry for incident triage, and Vercel tooling for deploy verification — so changes are validated before they reach users.",
  },
  {
    title: "Ship safely to production",
    body: "Additive database migrations only, patch/merge persistence (never wipe user rows), lint + build verification, and Playwright regression on auth and OAuth when integrations change.",
  },
] as const;

export default function PlatformDocsPage() {
  return (
    <DocsPageShell>
      <header className="mb-12 border-b border-slate-800 pb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">
          LifeNode OS
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white">
          Platform &amp; tools
        </h1>
        <p className="text-slate-400">
          How LifeNode OS is built, deployed, integrated, and improved — the stack
          under the hood and the workflow that keeps it reliable.
        </p>
      </header>

      <div className="space-y-14 leading-relaxed text-slate-300">
        <section className="space-y-6">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            Technology stack
          </h2>
          {STACK_GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-lg font-semibold text-cyan-300">{group.title}</h3>
              <ul className="list-disc space-y-2 pl-5 marker:text-slate-600">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            How we build, improve &amp; integrate
          </h2>
          <ol className="list-decimal space-y-5 pl-5 marker:text-cyan-500">
            {BUILD_WORKFLOW.map((step) => (
              <li key={step.title}>
                <strong className="text-slate-100">{step.title}</strong>
                <p className="mt-1 text-slate-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            GoHighLevel &amp; business automation mindset
          </h2>
          <p>
            LifeNode OS is not a GHL white-label — it is a separate product — but
            it inherits the same design instincts Ann uses for clients: clear
            pipelines, accountable handoffs, and automations that respect human
            review. BizNode triage and VANode client workflows mirror how
            high-performing agencies run CRMs without forcing everyone into one
            vertical SaaS template.
          </p>
          <p>
            Future connectors are prioritized when vendors offer stable OAuth or
            public APIs and when users report repeatable workflows (see{" "}
            <Link href="/support/feedback" className="text-teal-400 hover:underline">
              Feedback &amp; suggestions
            </Link>
            ).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            Local development
          </h2>
          <p>
            Developers run{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 text-sm text-cyan-300">
              npm run dev
            </code>{" "}
            from{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 text-sm text-cyan-300">
              app/lifenode-os
            </code>
            . Supabase env vars enable cloud sync; without them, local JSON fallbacks
            apply for shell state in development only. A server-only plan override
            exists for local QA of gated nodes — it never runs on Vercel production.
          </p>
        </section>

        <section className="space-y-4 border-t border-slate-800 pt-10">
          <h2 className="text-xl font-semibold text-white">Related docs</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <Link
                href={DOC_ROUTES.guide}
                className="text-teal-400 hover:underline"
              >
                User guide
              </Link>
            </li>
            <li>
              <Link
                href={DOC_ROUTES.security}
                className="text-teal-400 hover:underline"
              >
                Security
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </DocsPageShell>
  );
}
