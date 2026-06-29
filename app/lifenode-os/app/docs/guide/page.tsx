import Link from "next/link";
import DocsPageShell from "@/components/docs/DocsPageShell";
import {
  ALL_PRODUCT_SURFACES,
  DATA_PERSISTENCE_NOTE,
  GETTING_STARTED_STEPS,
  INTEGRATIONS_LIST,
  PRODUCT_NODES,
  SHELL_SURFACES,
} from "@/lib/product-catalog";
import { SUPPORT_ROUTES } from "@/lib/support/routes";

export const metadata = {
  title: "User Guide | LifeNode OS",
  description:
    "How to use LifeNode OS — shell surfaces, domain nodes, integrations, and data sync.",
};

function SurfaceSection({
  surfaces,
  title,
}: {
  surfaces: typeof ALL_PRODUCT_SURFACES;
  title: string;
}) {
  return (
    <section className="space-y-8">
      <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
        {title}
      </h2>
      {surfaces.map((surface) => (
        <div key={surface.id} id={surface.id} className="scroll-mt-24 space-y-3">
          <h3 className="text-lg font-semibold text-cyan-300">
            <Link
              href={surface.route}
              className="hover:text-cyan-200 hover:underline"
            >
              {surface.label}
            </Link>
          </h3>
          <p className="text-slate-400">{surface.blurb}</p>
          <ul className="list-disc space-y-2 pl-5 text-slate-300 marker:text-slate-600">
            {surface.features.map((f) => (
              <li key={f.id}>
                <strong className="text-slate-200">{f.label}</strong>
                {f.description ? (
                  <span className="text-slate-400"> — {f.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500">
            Open from the sidebar or visit{" "}
            <Link href={surface.route} className="text-teal-400 hover:underline">
              {surface.route}
            </Link>
            .
          </p>
        </div>
      ))}
    </section>
  );
}

export default function UserGuidePage() {
  return (
    <DocsPageShell>
      <header className="mb-12 border-b border-slate-800 pb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">
          LifeNode OS
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white">
          User Guide
        </h1>
        <p className="text-slate-400">
          Everything in the shell and each domain node — how to get started, where
          data lives, and how to connect your apps.
        </p>
      </header>

      <div className="space-y-14 leading-relaxed text-slate-300">
        <section className="space-y-6">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            Getting started
          </h2>
          <ol className="list-decimal space-y-4 pl-5 marker:text-cyan-500">
            {GETTING_STARTED_STEPS.map((step) => (
              <li key={step.title}>
                <strong className="text-slate-100">{step.title}</strong>
                <p className="mt-1 text-slate-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            Plans at a glance
          </h2>
          <ul className="list-disc space-y-2 pl-5 marker:text-slate-600">
            <li>
              <strong className="text-slate-200">Core (free)</strong> — BizNode,
              VANode, and HomeNode (including ChefNode recipes). Great for solo
              operators and households getting organized.
            </li>
            <li>
              <strong className="text-slate-200">Sync</strong> — Unlocks
              VitalNode and TraderNode, raises AI and integration limits, and
              adds VANode billable-hours tracking.
            </li>
            <li>
              <strong className="text-slate-200">Nexus</strong> — Full access
              including ProNode, highest AI credits, and expanded client and vault
              capacity for agencies and power users.
            </li>
          </ul>
          <p className="text-sm text-slate-500">
            Compare limits on the{" "}
            <Link href="/pricing" className="text-teal-400 hover:underline">
              pricing page
            </Link>{" "}
            or browse every surface in the{" "}
            <Link href="/catalog" className="text-teal-400 hover:underline">
              full catalog
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            How data saves
          </h2>
          <p>{DATA_PERSISTENCE_NOTE}</p>
          <p className="text-sm text-slate-500">
            Sign in on every device you use. Without Supabase credentials in
            production, the UI may show empty defaults even though your cloud rows
            still exist — contact support if data looks missing after deploy.
          </p>
        </section>

        <SurfaceSection surfaces={SHELL_SURFACES} title="Shell surfaces" />
        <SurfaceSection surfaces={PRODUCT_NODES} title="Domain nodes" />

        <section className="space-y-4">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            Integrations
          </h2>
          <p>
            Connect apps from Connected Apps inside each node, or from Calendar and
            Unified Inbox for Gmail, Slack, and Google Calendar.
          </p>
          <ul className="list-disc space-y-2 pl-5 marker:text-slate-600">
            {INTEGRATIONS_LIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            Mobile browser tips
          </h2>
          <p>
            LifeNode OS is a responsive web app — no separate install required. On
            your phone, open{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 text-sm text-cyan-300">
              lifenodeos.com
            </code>{" "}
            in Safari or Chrome, sign in, and use the menu (top right) to reach
            Pricing, the catalog, FAQ, and this documentation.
          </p>
          <p>
            Add to your home screen for quick access: in Safari tap Share → Add to
            Home Screen; in Chrome tap the menu → Add to Home screen.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-slate-800 pb-3 text-2xl font-semibold text-white">
            Support
          </h2>
          <p>
            Share product feedback or open a ticket for bugs, billing, or account
            issues.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <Link
                href={SUPPORT_ROUTES.feedback}
                className="text-teal-400 hover:underline"
              >
                Feedback &amp; suggestions
              </Link>
            </li>
            <li>
              <Link
                href={SUPPORT_ROUTES.ticket}
                className="text-teal-400 hover:underline"
              >
                Ticket escalation
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </DocsPageShell>
  );
}
