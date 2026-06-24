#!/usr/bin/env npx tsx
/**
 * Review uncommitted LifeNodeOS changes with a local Cursor agent.
 *
 * Requires CURSOR_API_KEY in workspace-root `.env.local` or `app/lifenode-os/.env.local`.
 * Mint a key: https://cursor.com/dashboard/cloud-agents
 *
 * Usage:
 *   npm run review:changes
 *   npm run review:changes
 *   npm run review:changes -- --staged-only
 *   npm run review:changes -- --dry-run
 */
import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Agent, CursorAgentError } from "@cursor/sdk";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(scriptDir, "..");
const appRoot = join(workspaceRoot, "app", "lifenode-os");
const reportPath = join(workspaceRoot, ".cursor", "last-review.md");

config({ path: join(workspaceRoot, ".env.local") });
config({ path: join(appRoot, ".env.local"), override: true });

const REVIEW_BRIEF = `You are reviewing uncommitted changes in LifeNodeOS, a Next.js 16 + Supabase SaaS app under app/lifenode-os/.

Prioritize:
- Next.js 16 app-router conventions (this repo is NOT standard Next.js — heed AGENTS.md)
- React hydration mismatches in "use client" components (dates, locale, random IDs)
- Supabase migration safety: RLS, idempotency, backwards compatibility
- Auth boundaries and secret handling
- Real bugs only — no praise-only comments

Output markdown with sections: ## Critical, ## Warning, ## Suggestion. If nothing to flag, say "No issues found."`;

function git(args: string): string {
  return execSync(`git ${args}`, {
    encoding: "utf-8",
    cwd: workspaceRoot,
    maxBuffer: 12 * 1024 * 1024,
  }).trimEnd();
}

async function collectChangeContext(stagedOnly: boolean): Promise<string | null> {
  const status = git("status --short -- app/lifenode-os");
  if (!status) return null;

  const parts: string[] = [`### git status (app/lifenode-os)\n\`\`\`\n${status}\n\`\`\``];

  if (stagedOnly) {
    const staged = git("diff --cached -- app/lifenode-os");
    if (staged) parts.push(`### staged diff\n\`\`\`diff\n${staged}\n\`\`\``);
  } else {
    const unstaged = git("diff -- app/lifenode-os");
    const staged = git("diff --cached -- app/lifenode-os");
    if (unstaged) parts.push(`### unstaged diff\n\`\`\`diff\n${unstaged}\n\`\`\``);
    if (staged) parts.push(`### staged diff\n\`\`\`diff\n${staged}\n\`\`\``);

    const untracked = git("ls-files --others --exclude-standard -- app/lifenode-os");
    if (untracked) {
      const previews: string[] = [];
      for (const rel of untracked.split("\n").slice(0, 8)) {
        const abs = join(workspaceRoot, rel);
        try {
          const text = await readFile(abs, "utf-8");
          previews.push(`--- ${rel} (new)\n+++ ${rel}\n${text.slice(0, 6000)}`);
        } catch {
          previews.push(`--- ${rel} (new, unreadable or binary)`);
        }
      }
      parts.push(`### new files (preview)\n\`\`\`diff\n${previews.join("\n\n")}\n\`\`\``);
    }
  }

  return parts.join("\n\n");
}

async function main() {
  const stagedOnly = process.argv.includes("--staged-only");
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.CURSOR_API_KEY?.trim();

  const changeContext = await collectChangeContext(stagedOnly);
  if (!changeContext) {
    console.log("No uncommitted changes under app/lifenode-os/ to review.");
    process.exit(0);
  }

  if (dryRun) {
    console.log(`${REVIEW_BRIEF}\n\n${changeContext}`);
    process.exit(0);
  }

  if (!apiKey) {
    console.error("Missing CURSOR_API_KEY.");
    console.error("Add it to .env.local (workspace root or app/lifenode-os).");
    console.error("Create a key: https://cursor.com/dashboard/cloud-agents");
    process.exit(1);
  }

  const prompt = `${REVIEW_BRIEF}\n\n${changeContext}`;
  const agent = await Agent.create({
    apiKey,
    model: { id: "composer-2" },
    local: { cwd: workspaceRoot, settingSources: [] },
  });

  let report = "";

  try {
    const run = await agent.send(prompt);
    console.log(`[review] agent=${agent.agentId} run=${run.id}\n`);

    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
            report += block.text;
          }
        }
      }
      if (event.type === "status") {
        console.error(`[review] status: ${event.status}`);
      }
    }

    const result = await run.wait();
    if (result.status !== "finished") {
      console.error(`\n[review] run ended as ${result.status} (${result.durationMs ?? "?"}ms)`);
      process.exit(2);
    }

    await mkdir(dirname(reportPath), { recursive: true });
    const header = `# LifeNodeOS change review\n\n_Generated ${new Date().toISOString()}_\n\n`;
    await writeFile(reportPath, header + report, "utf-8");
    console.log(`\n\n[review] saved to ${reportPath} (${result.durationMs ?? "?"}ms)`);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`[review] startup failed: ${err.message} (retryable=${err.isRetryable})`);
      process.exit(err.isRetryable ? 75 : 1);
    }
    throw err;
  } finally {
    agent.close();
  }
}

main();
