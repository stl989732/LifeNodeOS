# LifeNode OS — Master Rule Prompt

> Copy-paste prompts and routing rules for Cursor Agent.  
> Cursor auto-loads the condensed version from `.cursor/rules/lifenode-master-prompt.mdc`.

---

## One-line routing rule

**UI reviews → `web-design-guidelines`; API questions → Context7; node changes → Playwright on auth + OAuth flows.**

| Task type | Route to | When |
|-----------|----------|------|
| UI / UX review, accessibility, design audit | `.agents/skills/web-design-guidelines/SKILL.md` | Reviewing or changing components, pages, forms, modals |
| Library / framework API correctness | Context7 MCP (`plugin-context7-plugin-context7`) | Next.js 16, NextAuth, Supabase, React 19 patterns |
| Node feature changes, OAuth, integrations | Playwright MCP (`user-playwright`) | After auth, integration, or node surface changes |
| Production errors, crashes, Sentry alerts | Sentry MCP + `sentry-workflow` skill | User-reported bugs, Sentry URLs, regressions |
| DB schema, RLS, migrations | Supabase MCP | Touching `user_connected_apps`, `user_integrations`, trackers |
| Deploy / build failures | Vercel MCP | Build errors, runtime 500s, env drift |
| Premium UI build / redesign | `ui-ux-expert` or `app/lifenode-os/.claude/skills/ui-ux-pro-max/` | New dashboards, landing polish, design system work |
| Next.js performance / React structure | `vercel-react-best-practices`, `vercel-composition-patterns` | Bundle, data fetching, component refactors |

Context7 is **not** for business logic or debugging user data. Sentry is **not** for “is this Supabase syntax correct?”

---

## LifeNode OS context map

### Nodes (shell hats)

| Hat key | Node | Typical paths |
|---------|------|---------------|
| `work` | BizNode | `/work`, biz components |
| `home` | HomeNode | home / kitchen surfaces |
| `vital` | VitalNode | vital / wind-down |
| `trader` | TraderNode | trader surfaces |
| `va` | VANode | VANode sync, screen capture, `/api/vanode/*` |
| `pro` | ProNode | pro vault, timeline |

### Auth & identity (defense in depth)

- **NextAuth** (`app/lifenode-os/auth.ts`): JWT sessions; Google, GitHub, credentials.
- **Credentials**: unverified email accounts must not get a session (UI pre-check + server backstop).
- **OAuth integrations**: `beginOAuthFlow` → provider → `/api/integrations/[provider]/callback`.
- **ID split**: `session.user.id` (NextAuth) vs Supabase `auth.users` — use `resolveIntegrationUserId` for integration writes.
- **Never** expose service role or admin keys client-side.

### Tables to check when things break

| Table | Used for |
|-------|----------|
| `user_connected_apps` | Per-node app connection status (`syncing`, `connected`) |
| `user_integrations` | OAuth access/refresh tokens |
| `user_shell_state` | Last active node, hats |
| `lifenode_trackers` | Life Pulse tracker data |
| `credential_users` | Email/password auth |

### App root

All app code lives under `app/lifenode-os/`. Next.js 16 — read `node_modules/next/dist/docs/` before changing App Router code (see `app/lifenode-os/AGENTS.md`).

---

## Incident response (production / Sentry)

Use when a user hits an error, Sentry emails you, or you paste a Sentry issue URL.

### Master incident prompt

```
LifeNode OS incident: [symptom or Sentry URL]

Triage in order:
1. Sentry MCP — search_issues / search_issue_events; use analyze_issue_with_seer if needed
2. Supabase MCP — get_logs for DB/auth failures on affected tables
3. Vercel MCP — get_runtime_logs for failing API routes

Identify affected tables: user_connected_apps, user_integrations, user_shell_state, lifenode_trackers.

Propose a minimal fix. Explain what user data is affected.
Use Context7 only if the fix involves Next.js 16, NextAuth, or Supabase APIs.
After the fix, run Playwright on: sign-in → affected node load → OAuth connect (if integrations touched).

Do not auto-merge production fixes touching auth, RLS, or user data without summarizing risk.
When changes are complete and verified, commit and push (unless I say not to).
```

### Triage checklist

1. **Reproduce scope** — one user, one node, or global?
2. **Sentry** — stack trace, breadcrumbs, release, tags (`feature`, route).
3. **Logs** — Supabase (RLS denials, upsert failures); Vercel (`/api/integrations/*`, `/api/auth/*`).
4. **Schema** — migration applied? Column mismatch?
5. **Fix** — smallest diff; no unrelated refactors.
6. **Verify** — Playwright on critical path; `npm run lint` and `npm run build` in `app/lifenode-os`.
7. **Ship** — commit, push; confirm Sentry issue resolved or declining.

### What auto-detects errors

| Source | Auto? | Role |
|--------|-------|------|
| Sentry | Yes | Client + server exceptions, replays |
| Vercel logs | Partial | API/build failures |
| Supabase logs | Partial | DB/auth errors |
| Playwright | No | Regression prevention when you run it |
| Context7 | No | Docs only |

---

## General change / feature / replace request

Use for new features, refactors, replacements, or “change X to Y”.

### Master change prompt

```
LifeNode OS change: [describe what to add, change, or replace]

Before coding:
1. Read surrounding code and match existing conventions (minimal diff).
2. If touching DB — Supabase MCP: list_tables / get_advisors for affected tables; add migration if needed.
3. If touching APIs — Context7 for Next.js 16 route handlers / NextAuth / Supabase client patterns.
4. If touching UI — web-design-guidelines for review; ui-ux-expert for new design work.

Scope: app/lifenode-os only unless I specify otherwise.

After implementation:
1. npm run lint && npm run build (in app/lifenode-os)
2. Playwright: sign-in + [affected node] + OAuth if integrations changed
3. Summarize what changed and any migration/deploy steps
4. Commit and push when verified (unless I say not to)
```

---

## UI / UX design changes

Use when redesigning pages, improving UX, or fixing visual/accessibility issues.

### Master UI/UX prompt

```
LifeNode OS UI/UX: [page or component] — [goal: e.g. improve contrast, simplify onboarding, audit accessibility]

1. Read existing component and design tokens in app/lifenode-os (globals.css, shared UI).
2. For audits — web-design-guidelines (fetch latest guidelines, output file:line findings).
3. For new design direction — ui-ux-expert or ui-ux-pro-max skill.
4. For React structure — vercel-composition-patterns (avoid boolean prop proliferation).
5. Context7 only for Next.js / React 19 API usage, not layout taste.

Keep changes scoped to the requested surfaces. Verify responsive behavior and keyboard/focus states.
After changes: lint, build, Playwright smoke on the affected page flow.
Commit and push when verified (unless I say not to).
```

---

## Pre-release / node change gate

Use before merging node or integration work.

```
I'm changing [BizNode | HomeNode | VitalNode | TraderNode | VANode | ProNode] — [feature].

Pre-merge gate:
1. Supabase MCP — schema + RLS for [user_connected_apps | user_integrations | lifenode_trackers | other]
2. Context7 — Next.js 16 patterns if routing or data fetching changes
3. Playwright — sign-in → open [node] → [specific flow, e.g. VANode Connect Slack OAuth callback]
4. npm run lint && npm run build in app/lifenode-os

Report blockers before merge. Commit and push when green (unless I say not to).
```

### Playwright critical paths (minimum)

1. **Auth** — sign up → activation → sign in; password reset if touched.
2. **VANode OAuth** — Sync Workspace → Connect → callback → `user_connected_apps` = `connected`.
3. **Shell** — load app, switch hats, last active node persists.
4. **Edited node** — always smoke-test the node you changed.

Dev server: `npm run dev` in `app/lifenode-os` (default `http://localhost:3000`).

---

## Deploy / build failure

```
LifeNode OS deploy/build failure: [symptom or Vercel deployment URL]

1. Vercel MCP — latest deployment build logs and runtime logs
2. If runtime 500 — Sentry + Supabase get_logs in parallel
3. If build error — fix compile/type errors; Context7 for framework migration issues
4. Re-run build locally before push
Commit and push fix when verified.
```

---

## Post-change workflow (commit & push)

When the user asks for work to be completed end-to-end:

1. Run verification (`lint`, `build`, Playwright where relevant).
2. **Commit** with a concise message focused on *why* (only when user requested commit or implied ship-it).
3. **Push** to remote when user asked to push or said “commit and push after changes.”

Skip commit/push if:

- User said “don’t commit” or “plan only”
- Verification failed
- Changes touch secrets (`.env`, tokens) — warn instead of committing

---

## Quick prompt cheat sheet

| I want to… | Say |
|------------|-----|
| Fix a Sentry error | Paste incident prompt + Sentry URL |
| Review UI accessibility | “Review `[file]` with web-design-guidelines” |
| Confirm Next.js API usage | “Use Context7: correct pattern for [X] in Next.js 16” |
| Prove OAuth still works | “Playwright: sign-in → VANode → Connect [provider]” |
| Check DB before migration | “Supabase MCP: list_tables + get_advisors for [table]” |
| Redesign a dashboard | UI/UX master prompt + ui-ux-expert |
| Ship a node feature | Pre-release gate prompt |

---

## File locations

| File | Purpose |
|------|---------|
| `docs/MASTER-RULE-PROMPT.md` | This document — full prompts and context |
| `.cursor/rules/lifenode-master-prompt.mdc` | Always-on Cursor rule (condensed) |
| `.agents/skills/web-design-guidelines/SKILL.md` | UI audit skill |
| `app/lifenode-os/AGENTS.md` | Next.js 16 agent warnings |
