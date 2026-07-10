"use client";

import { landingDarkText } from "./landingDarkTheme";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";
const FONT_PLAYFAIR = "font-[family-name:var(--font-playfair)]";

const EXTRACTABLE_FACTS = [
  {
    term: "App fragmentation",
    detail:
      "Using 10–15 disconnected apps (Gmail, Slack, Notion, calendars, health trackers) that do not share context.",
  },
  {
    term: "Tool orchestration",
    detail:
      "Connecting those tools once, then routing work through role-based Nodes and AI triage instead of tab-hopping.",
  },
  {
    term: "Life OS category",
    detail:
      "A single command center for every hat you wear — business, household, clients, markets, and recovery.",
  },
] as const;

export default function LandingOrchestrationIntro() {
  return (
    <section
      id="what-is-lifenode"
      className={`${FONT_OUTFIT} relative z-10 mx-auto w-full max-w-5xl px-4 pb-12 pt-2 md:px-6`}
      aria-labelledby="orchestration-intro-heading"
    >
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.28em] text-[#17C4B3]">
        Life orchestration
      </p>
      <h2
        id="orchestration-intro-heading"
        className={`${FONT_PLAYFAIR} mt-3 text-center text-3xl font-semibold italic leading-tight text-white md:text-4xl`}
      >
        One dashboard to orchestrate your tools — not fight app fragmentation
      </h2>
      <p
        className={`mx-auto mt-5 max-w-3xl text-center text-base leading-relaxed md:text-lg ${landingDarkText.subtitle}`}
      >
        <strong className={`font-semibold ${landingDarkText.subtitleStrongBrand}`}>
          LifeNode OS
        </strong>{" "}
        is a
        life orchestration platform for founders, parents, virtual assistants, and
        traders who run multiple roles at once. It connects Gmail, Slack, Google
        Calendar, Notion, Stripe, and health tools into focused{" "}
        <strong className={`font-semibold ${landingDarkText.subtitleStrongEmphasis}`}>
          Nodes
        </strong>{" "}
        — so your
        work, home, client, and recovery stacks share one intelligent dashboard
        instead of fifteen browser tabs.
      </p>

      <dl className="mt-10 grid gap-4 md:grid-cols-3">
        {EXTRACTABLE_FACTS.map(({ term, detail }) => (
          <div
            key={term}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 backdrop-blur-sm"
          >
            <dt className="text-sm font-bold text-white">{term}</dt>
            <dd className={`mt-2 text-sm leading-relaxed ${landingDarkText.planFeatures}`}>
              {detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
