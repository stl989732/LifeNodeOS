import type { Metadata } from "next";
import Link from "next/link";
import DocsPageShell from "@/components/docs/DocsPageShell";
import { DOC_ROUTES } from "@/lib/docs/routes";
import { SUPPORT_ROUTES } from "@/lib/support/routes";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Documentation | LifeNode OS",
  description:
    "LifeNode OS documentation — about the product, user guide, platform stack, and security.",
  alternates: { canonical: `${SITE_URL}${DOC_ROUTES.hub}` },
};

const DOC_CARDS = [
  {
    href: DOC_ROUTES.about,
    title: "About LifeNode OS",
    description:
      "Meet the creator, the mission behind the product, and who LifeNode OS is built for.",
  },
  {
    href: DOC_ROUTES.guide,
    title: "User guide",
    description:
      "Step-by-step help for the shell, every node, integrations, and how your data syncs.",
  },
  {
    href: DOC_ROUTES.platform,
    title: "Platform & tools",
    description:
      "The technologies we use to build, deploy, integrate, and improve LifeNode OS.",
  },
  {
    href: DOC_ROUTES.security,
    title: "Security",
    description:
      "How we protect accounts, OAuth tokens, user data, and production infrastructure.",
  },
] as const;

export default function DocsHubPage() {
  return (
    <DocsPageShell>
      <header className="mb-12 border-b border-slate-800 pb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">
          LifeNode OS
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white">
          Documentation
        </h1>
        <p className="text-slate-400">
          Everything you need to understand LifeNode OS — from getting started in
          each node to how we build and secure the platform.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {DOC_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition hover:border-cyan-500/40 hover:bg-slate-900/70"
          >
            <h2 className="text-lg font-semibold text-white group-hover:text-cyan-300">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {card.description}
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-teal-400 group-hover:underline">
              Read more →
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-14 space-y-4 border-t border-slate-800 pt-10">
        <h2 className="text-xl font-semibold text-white">Need help?</h2>
        <p className="text-slate-400">
          For product ideas, bugs, or billing questions, use the Support links on
          the landing page or open a ticket from Settings when signed in.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-slate-300">
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
    </DocsPageShell>
  );
}
