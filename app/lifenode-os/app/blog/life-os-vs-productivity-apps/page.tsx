import type { Metadata } from "next";
import Link from "next/link";
import BlogArticleShell from "@/components/blog/BlogArticleShell";
import { getBlogPost } from "@/lib/blog/posts";

const SITE_URL = "https://lifenodeos.com";
const SLUG = "life-os-vs-productivity-apps";

const post = getBlogPost(SLUG)!;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: post.keywords,
  alternates: { canonical: `${SITE_URL}/blog/${SLUG}` },
  openGraph: {
    title: post.title,
    description: post.description,
    url: `${SITE_URL}/blog/${SLUG}`,
    type: "article",
    publishedTime: post.publishedAt,
    siteName: "LifeNode OS",
  },
  twitter: {
    card: "summary_large_image",
    title: post.title,
    description: post.description,
  },
};

function articleJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: "LifeNode OS", url: SITE_URL },
    publisher: { "@type": "Organization", name: "LifeNode OS", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${SLUG}`,
    keywords: post.keywords.join(", "),
  };
}

const articleBodyClass =
  "mt-10 space-y-10 text-base leading-relaxed text-slate-300 [&_a]:font-semibold [&_a]:text-[#17C4B3] [&_a]:hover:text-[#00ffc8] [&_a]:hover:underline [&_strong]:text-slate-200 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5";

export default function LifeOsVsProductivityAppsPage() {
  return (
    <BlogArticleShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd()) }}
      />

      <header className="border-b border-slate-800 pb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#17C4B3]">
          Life OS
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white md:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>{" "}
          · {post.readingMinutes} min read
        </p>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">{post.description}</p>
      </header>

      <div className={articleBodyClass}>
        <section className="space-y-4">
          <h2>Productivity apps vs a life OS — what is the difference?</h2>
          <p>
            A <strong>productivity app</strong> helps you capture and organize work:
            tasks in Todoist, docs in Notion, projects in{" "}
            <Link href="/compare/clickup">ClickUp</Link>, messages in Slack. Each
            does one job well. A <strong>life OS</strong> (life orchestration
            platform) sits above them — connecting the tools you already pay for
            and routing activity through <strong>role-based workspaces</strong>{" "}
            (business, clients, home, health) instead of one endless task list.
          </p>
          <p>
            If you wear one hat and one team uses one stack, a productivity suite
            is often enough. If you are a founder-parent-VA who lives in Gmail,
            Slack, and three other apps daily, you are fighting{" "}
            <Link href="/blog/app-fragmentation">app fragmentation</Link> — and
            need orchestration, not another inbox inside a PM tool.
          </p>
        </section>

        <section className="space-y-4">
          <h2>When a productivity app is the right tool</h2>
          <p>Stay with Notion, ClickUp, Todoist, or Monday when:</p>
          <ul>
            <li>One team shares one workspace and one workflow.</li>
            <li>Your work stays inside that product — little email or client CRM outside it.</li>
            <li>You do not switch between business, household, and client delivery roles.</li>
            <li>You are optimizing tasks and docs, not connecting OAuth apps across life domains.</li>
          </ul>
          <p>
            These tools are excellent <strong>systems of record</strong> for projects.
            They are weaker when your real work spans Gmail threads, Slack pings, calendar
            holds, and client proof-of-work — all at once.
          </p>
        </section>

        <section className="space-y-4">
          <h2>When you need a life OS instead</h2>
          <p>Consider a life orchestration platform when:</p>
          <ul>
            <li>You manage <strong>clients</strong> (EOD reports, billable hours, screen proof) plus your own business.</li>
            <li><strong>Household logistics</strong> compete with work in the same week — not a separate “personal” app.</li>
            <li>You want Gmail, Slack, and calendars <strong>connected once</strong>, not re-entered into a PM tool.</li>
            <li>AI should know your <strong>role context</strong> (VA vs founder vs parent), not just a single workspace.</li>
          </ul>
          <p>
            LifeNode OS uses <strong>Nodes</strong> — BizNode, VANode, HomeNode, VitalNode,
            TraderNode, ProNode — so each hat gets the right widgets and integrations.{" "}
            <strong>Linos</strong> triages across them; Logic Bridges (Sync+) connect workflows
            without Zapier spaghetti.
          </p>
        </section>

        <section className="space-y-4">
          <h2>Quick comparison: productivity stack vs LifeNode OS</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80">
                  <th className="p-3 font-semibold text-white">Dimension</th>
                  <th className="p-3 font-semibold text-white">Typical productivity app</th>
                  <th className="p-3 font-semibold text-[#17C4B3]">LifeNode OS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="p-3 text-slate-400">Primary unit</td>
                  <td className="p-3">Tasks, docs, projects</td>
                  <td className="p-3">Role-based Nodes</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-400">Email &amp; chat</td>
                  <td className="p-3">Integrations or copy-paste</td>
                  <td className="p-3">OAuth per Node + unified inbox (paid tiers)</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-400">Client proof-of-work</td>
                  <td className="p-3">Time tracking add-ons</td>
                  <td className="p-3">VANode EOD + screen capture</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-400">Home / family</td>
                  <td className="p-3">Personal lists only</td>
                  <td className="p-3">HomeNode + ChefNode on Core (free)</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-400">Free solo wedge</td>
                  <td className="p-3">Varies; often team-priced</td>
                  <td className="p-3">Core $0 — Biz + VA + Home</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2>Life OS vs popular productivity tools</h2>
          <ul>
            <li>
              <Link href="/compare/notion">LifeNode OS vs Notion</Link> — opinionated
              Nodes vs build-your-own workspace
            </li>
            <li>
              <Link href="/compare/clickup">LifeNode OS vs ClickUp</Link> — multi-hat
              orchestration vs team project management
            </li>
            <li>
              <Link href="/compare/sunsama">LifeNode OS vs Sunsama</Link> — full life
              OS vs daily planning layer
            </li>
            <li>
              <Link href="/compare">All comparisons</Link>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2>Can you use both?</h2>
          <p>
            Yes. Many operators keep Notion or ClickUp for a team wiki while using
            LifeNode OS as the <strong>orchestration layer</strong> for inbox, clients,
            and home. The goal is not to rip out every app overnight — it is to stop
            being the human API between them.
          </p>
          <p>
            Start on <strong>Core (free)</strong>: connect what you can, run BizNode +
            VANode + HomeNode for two weeks, and measure tab count and context switches.
            Upgrade to Sync or Nexus when VitalNode, bridges, or higher AI caps matter.
          </p>
        </section>

        <section className="space-y-4">
          <h2>Bottom line</h2>
          <p>
            Productivity apps organize <em>work items</em>. A life OS organizes{" "}
            <em>your roles and connected tools</em>. If your problem is “too many
            projects in one team,” stick with ClickUp or Notion. If your problem is
            “too many hats and too many apps,” you want orchestration.
          </p>
          <p>
            <Link href="/">Try LifeNode OS free (Core)</Link> ·{" "}
            <Link href="/blog/app-fragmentation">What is app fragmentation?</Link> ·{" "}
            <Link href="/compare">Compare alternatives</Link>
          </p>
        </section>
      </div>
    </BlogArticleShell>
  );
}
