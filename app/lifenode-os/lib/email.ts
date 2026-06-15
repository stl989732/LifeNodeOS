import fs from "fs/promises";
import path from "path";

/**
 * Dev-safe email transport.
 *
 * In dev (and any env without a configured provider) we:
 *   - log a single-line banner to the server console with the action link
 *   - write the full HTML to `data/dev-emails/<timestamp>-<recipient>.html`
 *     so the operator can preview rendered output in a browser
 *
 * The `link` field is also returned to the caller. In dev the activation /
 * reset UIs show this link inline so the developer can click through
 * without leaving the app.
 *
 * To swap in a real provider (Resend, Postmark, SES, etc.) implement
 * `dispatchEmail` against your SDK. The signature stays stable.
 */

export type EmailKind = "verify" | "reset";

export type SendEmailInput = {
  to: string;
  subject: string;
  /** Plain text body — used for the console banner + as a fallback. */
  text: string;
  /** HTML body for the actual email. */
  html: string;
  kind: EmailKind;
  /** Optional action URL — printed prominently to the console. */
  link?: string;
};

export type SendEmailResult = {
  delivered: boolean;
  /** Path to the local HTML file (dev only). */
  previewPath?: string;
  /** Echo of the action URL so dev UIs can show it. */
  link?: string;
};

const DEV_OUTBOX = path.join(process.cwd(), "data", "dev-emails");

function emailProviderKey(): string | null {
  return (
    process.env.RESEND_API_KEY?.trim() ||
    process.env.LIFENODE_EMAIL_PROVIDER_KEY?.trim() ||
    null
  );
}

const DEFAULT_FROM_ADDRESS = "LifeNode OS <support@lifenodeos.com>";

function emailFromAddress(): string {
  return (
    process.env.LIFENODE_EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    DEFAULT_FROM_ADDRESS
  );
}

function emailProviderConfigured(): boolean {
  return Boolean(emailProviderKey());
}

async function writeDevPreview(
  to: string,
  subject: string,
  html: string
): Promise<string> {
  await fs.mkdir(DEV_OUTBOX, { recursive: true });
  const safeTo = to.replace(/[^a-zA-Z0-9@._-]/g, "_");
  const filename = `${Date.now()}-${safeTo}.html`;
  const full = path.join(DEV_OUTBOX, filename);
  const wrapper = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#0b1220;color:#e2e8f0;font-family:system-ui,sans-serif">
  <div style="padding:24px 32px;border-bottom:1px solid #1e293b">
    <div style="font-size:11px;color:#94a3b8;letter-spacing:.18em;text-transform:uppercase">LifeNode OS · Dev Outbox</div>
    <div style="margin-top:4px;font-size:13px;color:#cbd5e1">to: ${escapeHtml(to)}</div>
    <div style="font-size:13px;color:#cbd5e1">subject: ${escapeHtml(subject)}</div>
  </div>
  <div style="padding:24px 32px">${html}</div>
</body></html>`;
  await fs.writeFile(full, wrapper, "utf8");
  return full;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Production-grade dispatch (no-op stub). Wire your provider here.
 *
 * Example (Resend):
 *   const { Resend } = await import("resend");
 *   const resend = new Resend(process.env.LIFENODE_EMAIL_PROVIDER_KEY);
 *   await resend.emails.send({
 *     from: "LifeNode OS <support@lifenodeos.com>",
 *     to: input.to,
 *     subject: input.subject,
 *     html: input.html,
 *     text: input.text,
 *   });
 */
async function dispatchEmail(input: SendEmailInput): Promise<void> {
  const apiKey = emailProviderKey();
  if (!apiKey) {
    throw new Error(
      "Email provider not configured. Set RESEND_API_KEY or LIFENODE_EMAIL_PROVIDER_KEY.",
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Resend API ${res.status}${body ? `: ${body.slice(0, 240)}` : ""}`,
    );
  }
}

function isServerlessProduction(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production"
  );
}

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  if (emailProviderConfigured()) {
    try {
      await dispatchEmail(input);
      return { delivered: true, link: input.link };
    } catch (err) {
      console.error("[LifeNode email] provider failed, falling back to dev preview:", err);
    }
  }

  if (isServerlessProduction()) {
    console.log(
      [
        "──────────────────────────────────────────────────────",
        `[LifeNode email · ${input.kind.toUpperCase()}] LOG ONLY (no provider)`,
        `to:      ${input.to}`,
        `subject: ${input.subject}`,
        input.link ? `link:    ${input.link}` : null,
        "Set LIFENODE_EMAIL_PROVIDER_KEY + wire dispatchEmail to send real mail.",
        "──────────────────────────────────────────────────────",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return { delivered: false, link: input.link };
  }

  try {
    const previewPath = await writeDevPreview(input.to, input.subject, input.html);
    console.log(
      [
        "──────────────────────────────────────────────────────",
        `[LifeNode email · ${input.kind.toUpperCase()}] DEV DELIVERY`,
        `to:      ${input.to}`,
        `subject: ${input.subject}`,
        input.link ? `link:    ${input.link}` : null,
        `preview: ${previewPath}`,
        "──────────────────────────────────────────────────────",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return { delivered: true, previewPath, link: input.link };
  } catch (err) {
    console.error("[LifeNode email] dev preview write failed:", err);
    return { delivered: false, link: input.link };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// High-level templates
// ─────────────────────────────────────────────────────────────────────────────

function authBaseUrl(): string {
  return (
    process.env.AUTH_URL?.replace(/\/+$/, "") ??
    process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ??
    "http://localhost:3000"
  );
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  displayName?: string | null
): Promise<SendEmailResult> {
  const base = authBaseUrl();
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const subject = "Activate your LifeNode OS account";
  const greeting = displayName?.trim()
    ? `Hi ${escapeHtml(displayName.trim())},`
    : "Welcome to LifeNode OS,";

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;background:#f8fafc;padding:24px;border-radius:12px;max-width:560px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a">${greeting}</h1>
      <p style="margin:0 0 16px;color:#334155;line-height:1.6">
        Your LifeNode OS account is one click away. Activate your email to unlock
        the Unified Hub, your Nodes, and Lino's intelligence layer.
      </p>
      <p style="margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#0f172a;color:white;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
          Activate my account
        </a>
      </p>
      <p style="margin:16px 0 0;color:#475569;font-size:13px;line-height:1.6">
        Or copy this link into your browser:<br>
        <code style="word-break:break-all;color:#0f172a">${link}</code>
      </p>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
        This link expires in 24 hours. If you didn't create this account you can
        safely ignore this email.
      </p>
    </div>`;

  const text = [
    "Activate your LifeNode OS account.",
    "",
    `Click to activate: ${link}`,
    "",
    "This link expires in 24 hours.",
  ].join("\n");

  return sendEmail({ to, subject, text, html, kind: "verify", link });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  displayName?: string | null
): Promise<SendEmailResult> {
  const base = authBaseUrl();
  const link = `${base}/auth/reset/${encodeURIComponent(token)}`;
  const subject = "Reset your LifeNode OS password";
  const greeting = displayName?.trim()
    ? `Hi ${escapeHtml(displayName.trim())},`
    : "Hi,";

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;background:#f8fafc;padding:24px;border-radius:12px;max-width:560px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a">${greeting}</h1>
      <p style="margin:0 0 16px;color:#334155;line-height:1.6">
        Forgot your password? No problem. Follow the link below and answer your
        security questions to set a new one.
      </p>
      <p style="margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#0f172a;color:white;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
          Answer security questions and reset password
        </a>
      </p>
      <p style="margin:16px 0 0;color:#475569;font-size:13px;line-height:1.6">
        Or copy this link into your browser:<br>
        <code style="word-break:break-all;color:#0f172a">${link}</code>
      </p>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
        This link expires in 1 hour. If you didn't request a reset you can
        safely ignore this email — your password stays the same.
      </p>
    </div>`;

  const text = [
    "Reset your LifeNode OS password.",
    "",
    `Open this link to answer your security questions: ${link}`,
    "",
    "Expires in 1 hour. Ignore if you didn't request this.",
  ].join("\n");

  return sendEmail({ to, subject, text, html, kind: "reset", link });
}
