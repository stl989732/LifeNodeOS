import Link from "next/link";
import DocsPageShell from "@/components/docs/DocsPageShell";
import { DOC_ROUTES } from "@/lib/docs/routes";

export const metadata = {
  title: "Security | LifeNode OS Documentation",
  description:
    "How LifeNode OS protects accounts, OAuth tokens, user data, and production infrastructure.",
};

export default function SecurityDocsPage() {
  return (
    <DocsPageShell>
      <header className="mb-12 border-b border-slate-800 pb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">
          LifeNode OS
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white">
          Security
        </h1>
        <p className="text-slate-400">
          How LifeNode OS protects your account, integrations, and workspace data
          — from sign-in through storage, APIs, and production hosting.
        </p>
      </header>

      <div className="space-y-12 leading-relaxed text-slate-300">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Account &amp; authentication
          </h2>
          <ul className="list-disc space-y-3 pl-5 marker:text-slate-600">
            <li>
              <strong className="text-slate-200">Sign-in options</strong> — Email
              and password (stored as bcrypt hashes) or Google OAuth via NextAuth.
              Sessions are HTTP-only cookies managed server-side.
            </li>
            <li>
              <strong className="text-slate-200">Password recovery</strong> —{" "}
              Security questions (hashed answers) and email-based reset flows.
              Questions are chosen from a fixed bank at registration to reduce
              guessable prompts.
            </li>
            <li>
              <strong className="text-slate-200">Session isolation</strong> —{" "}
              Client-side storage is scoped per signed-in user so switching
              accounts on a shared device does not leak node data between users.
            </li>
            <li>
              <strong className="text-slate-200">API authentication</strong> —{" "}
              Server routes verify the session before reading or mutating user
              data. Treat every API route like a public endpoint — auth is
              enforced inside the handler.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Data storage</h2>
          <ul className="list-disc space-y-3 pl-5 marker:text-slate-600">
            <li>
              <strong className="text-slate-200">Supabase (PostgreSQL)</strong> —{" "}
              Primary store for shell state, widgets, trackers, subscriptions,
              integrations, and node tables. Production requires{" "}
              <code className="rounded bg-slate-900 px-1 text-cyan-300">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and a server-only service role key on Vercel.
            </li>
            <li>
              <strong className="text-slate-200">Row Level Security</strong> — RLS
              policies restrict reads and writes to the authenticated user&apos;s
              rows. Schema changes are reviewed so policies do not silently block
              legitimate access.
            </li>
            <li>
              <strong className="text-slate-200">Merge, not replace</strong> —{" "}
              User payloads are patched and upserted. Deploys and UI updates do not
              reset dashboards to empty defaults when data already exists.
            </li>
            <li>
              <strong className="text-slate-200">Browser cache</strong> — Some
              nodes use localStorage as a fast cache with user-scoped keys. Cloud
              data wins when newer; caches migrate forward when storage keys
              evolve.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Integrations &amp; OAuth
          </h2>
          <ul className="list-disc space-y-3 pl-5 marker:text-slate-600">
            <li>
              <strong className="text-slate-200">Server-side tokens</strong> —{" "}
              OAuth access and refresh tokens for Gmail, Slack, Calendar, and
              other connectors live in{" "}
              <code className="rounded bg-slate-900 px-1 text-cyan-300">
                user_integrations
              </code>
              . They are never exposed to the browser or client bundles.
            </li>
            <li>
              <strong className="text-slate-200">OAuth callbacks</strong> —{" "}
              Standard redirect flows through{" "}
              <code className="rounded bg-slate-900 px-1 text-cyan-300">
                /api/integrations/[provider]/callback
              </code>
              . Only requested scopes are stored for each connection.
            </li>
            <li>
              <strong className="text-slate-200">Disconnect &amp; delete</strong>{" "}
              — Users can disconnect apps per node. Account deletion removes
              persisted rows tied to the user across shell, widgets, and
              integrations.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            HTTP &amp; browser security
          </h2>
          <p>
            Production responses include hardened headers configured in{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 text-sm text-cyan-300">
              lib/security-headers.ts
            </code>
            :
          </p>
          <ul className="list-disc space-y-2 pl-5 marker:text-slate-600">
            <li>Content-Security-Policy — limits script, connect, and frame sources</li>
            <li>Strict-Transport-Security (HSTS) — HTTPS enforced in production</li>
            <li>X-Frame-Options, X-Content-Type-Options, Referrer-Policy</li>
            <li>Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy</li>
            <li>
              Permissions-Policy — restricts geolocation and payment APIs by default;
              camera and microphone are allowed on this site for Kitchen pantry scans
              and EOD screen capture narration
            </li>
          </ul>
          <p className="text-sm text-slate-500">
            User-generated HTML is sanitized where rendered (DOMPurify) to reduce
            XSS risk in rich-text surfaces.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Billing &amp; secrets
          </h2>
          <ul className="list-disc space-y-3 pl-5 marker:text-slate-600">
            <li>
              Lemon Squeezy handles card data — LifeNode OS does not store full
              payment numbers. Webhooks update subscription status server-side.
            </li>
            <li>
              API keys (Supabase service role, Lemon Squeezy, OAuth client
              secrets, AI providers) live only in server environment variables —
              never in{" "}
              <code className="rounded bg-slate-900 px-1 text-cyan-300">
                NEXT_PUBLIC_*
              </code>{" "}
              vars.
            </li>
            <li>
              Dev-only flags such as plan overrides and fresh-session skips are
              blocked from production deploy targets.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Monitoring &amp; incident response
          </h2>
          <p>
            Sentry captures client and server errors in production. Operational
            triage follows: Sentry → Supabase logs → Vercel runtime logs. User-data
            impact is assessed before any fix that touches persistence or RLS.
          </p>
          <p>
            Report security concerns through{" "}
            <Link href="/support/ticket" className="text-teal-400 hover:underline">
              Ticket escalation
            </Link>{" "}
            and mark the issue as security-related so it can be prioritized.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Your responsibilities</h2>
          <ul className="list-disc space-y-2 pl-5 marker:text-slate-600">
            <li>Use a strong, unique password and enable Google sign-in where possible.</li>
            <li>Sign out on shared devices after use.</li>
            <li>Review connected apps periodically and disconnect unused integrations.</li>
            <li>Do not share billable-hours or vault share links publicly unless intended.</li>
          </ul>
          <p className="text-sm text-slate-500">
            See also our{" "}
            <Link href="/privacy" className="text-teal-400 hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-teal-400 hover:underline">
              Terms of Use
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4 border-t border-slate-800 pt-10">
          <h2 className="text-xl font-semibold text-white">Related docs</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <Link
                href={DOC_ROUTES.platform}
                className="text-teal-400 hover:underline"
              >
                Platform &amp; tools
              </Link>
            </li>
            <li>
              <Link
                href={DOC_ROUTES.guide}
                className="text-teal-400 hover:underline"
              >
                User guide
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </DocsPageShell>
  );
}
