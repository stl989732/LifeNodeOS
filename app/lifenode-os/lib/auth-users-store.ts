import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Credentialed account store. File-backed JSON at `data/auth-users.json`.
 * Mirrors the discipline of the rest of the persistence layer.
 *
 * Records carry everything needed for the activation + recovery flow:
 *   - `emailVerified` + verification token (LifeNode OS requires verification
 *     before credentials sign-in succeeds)
 *   - `passwordResetToken` (Forgot Password)
 *   - `securityQuestions[]` (hashed answers used during reset)
 *
 * Legacy records (created before activation existed) load with
 * `emailVerified = true` so existing testers don't get locked out.
 */

export type SecurityQuestion = {
  /** Stable key for the question (e.g. "first-pet"). */
  id: string;
  /** Display text the user saw when answering. */
  question: string;
  /** Bcrypt hash of the lower-cased trimmed answer. */
  answerHash: string;
};

export type TokenRecord = {
  /** Token value (URL-safe, 32 bytes hex). */
  value: string;
  /** ISO timestamp. */
  expiresAt: string;
};

export type StoredCredentialUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: string;
  emailVerified: boolean;
  emailVerificationToken: TokenRecord | null;
  passwordResetToken: TokenRecord | null;
  securityQuestions: SecurityQuestion[];
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_PATH = path.join(DATA_DIR, "auth-users.json");

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Canonical security question bank. Sign-up requires the user to answer at
 * least two distinct questions from this list. The id is what we persist
 * alongside the answer hash, so the question copy can be tweaked later
 * without invalidating stored data.
 */
export const SECURITY_QUESTION_BANK: { id: string; question: string }[] = [
  { id: "first-pet", question: "What was the name of your first pet?" },
  { id: "birth-city", question: "In what city were you born?" },
  { id: "mother-maiden", question: "What is your mother's maiden name?" },
  { id: "first-school", question: "What was the name of your first school?" },
  { id: "favorite-teacher", question: "Who was your favorite teacher?" },
  { id: "first-street", question: "What street did you grow up on?" },
  { id: "first-car", question: "What was the make of your first car?" },
];

const SECURITY_QUESTION_BY_ID = new Map(
  SECURITY_QUESTION_BANK.map((q) => [q.id, q.question])
);

export const SECURITY_QUESTIONS_REQUIRED = 2;

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_PATH);
  } catch {
    await fs.writeFile(USERS_PATH, "[]", "utf8");
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeUser(raw: unknown): StoredCredentialUser | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.email !== "string") return null;
  if (typeof r.passwordHash !== "string") return null;
  const createdAt =
    typeof r.createdAt === "string" ? r.createdAt : nowIso();
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.passwordHash,
    name: typeof r.name === "string" ? r.name : null,
    createdAt,
    emailVerified:
      typeof r.emailVerified === "boolean"
        ? r.emailVerified
        : /* legacy records pre-activation: assume already verified */ true,
    emailVerificationToken: normalizeToken(r.emailVerificationToken),
    passwordResetToken: normalizeToken(r.passwordResetToken),
    securityQuestions: Array.isArray(r.securityQuestions)
      ? r.securityQuestions
          .map(normalizeQuestion)
          .filter((q): q is SecurityQuestion => Boolean(q))
      : [],
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : createdAt,
  };
}

function normalizeToken(raw: unknown): TokenRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.value !== "string" || typeof r.expiresAt !== "string") {
    return null;
  }
  return { value: r.value, expiresAt: r.expiresAt };
}

function normalizeQuestion(raw: unknown): SecurityQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.question !== "string" ||
    typeof r.answerHash !== "string"
  ) {
    return null;
  }
  return { id: r.id, question: r.question, answerHash: r.answerHash };
}

async function readUsers(): Promise<StoredCredentialUser[]> {
  await ensureStore();
  const raw = await fs.readFile(USERS_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeUser)
      .filter((u): u is StoredCredentialUser => Boolean(u));
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredCredentialUser[]): Promise<void> {
  await ensureStore();
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

function generateTokenValue(): string {
  return crypto.randomBytes(32).toString("hex");
}

function freshToken(ttlMs: number): TokenRecord {
  return {
    value: generateTokenValue(),
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
}

function isTokenLive(token: TokenRecord | null): boolean {
  if (!token) return false;
  return new Date(token.expiresAt).getTime() > Date.now();
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export async function findCredentialUserByEmail(
  email: string
): Promise<StoredCredentialUser | null> {
  const normalized = email.trim().toLowerCase();
  const users = await readUsers();
  return users.find((u) => u.email === normalized) ?? null;
}

export async function findUserByVerificationToken(
  token: string
): Promise<StoredCredentialUser | null> {
  const users = await readUsers();
  return (
    users.find(
      (u) =>
        u.emailVerificationToken?.value === token &&
        isTokenLive(u.emailVerificationToken)
    ) ?? null
  );
}

export async function findUserByResetToken(
  token: string
): Promise<StoredCredentialUser | null> {
  const users = await readUsers();
  return (
    users.find(
      (u) =>
        u.passwordResetToken?.value === token &&
        isTokenLive(u.passwordResetToken)
    ) ?? null
  );
}

export async function verifyCredentialPassword(
  user: StoredCredentialUser,
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export type SecurityQuestionInput = {
  id: string;
  answer: string;
};

export type CreateCredentialUserInput = {
  email: string;
  password: string;
  name: string;
  securityQuestions: SecurityQuestionInput[];
};

export type CreateCredentialUserResult = {
  user: StoredCredentialUser;
  verificationToken: string;
};

export async function createCredentialUser(
  input: CreateCredentialUserInput
): Promise<CreateCredentialUserResult> {
  const email = input.email.trim().toLowerCase();
  const users = await readUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error("EMAIL_IN_USE");
  }
  if (input.password.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }
  if (input.securityQuestions.length < SECURITY_QUESTIONS_REQUIRED) {
    throw new Error("SECURITY_QUESTIONS_REQUIRED");
  }
  const seenIds = new Set<string>();
  const hashedQuestions: SecurityQuestion[] = [];
  for (const sq of input.securityQuestions) {
    const question = SECURITY_QUESTION_BY_ID.get(sq.id);
    if (!question) throw new Error("INVALID_SECURITY_QUESTION");
    if (seenIds.has(sq.id)) throw new Error("DUPLICATE_SECURITY_QUESTION");
    if (!sq.answer.trim()) throw new Error("EMPTY_SECURITY_ANSWER");
    seenIds.add(sq.id);
    const answerHash = await bcrypt.hash(normalizeAnswer(sq.answer), 10);
    hashedQuestions.push({ id: sq.id, question, answerHash });
  }

  const now = nowIso();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const verificationToken = freshToken(VERIFICATION_TTL_MS);
  const user: StoredCredentialUser = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    name: input.name.trim() || null,
    createdAt: now,
    updatedAt: now,
    emailVerified: false,
    emailVerificationToken: verificationToken,
    passwordResetToken: null,
    securityQuestions: hashedQuestions,
  };
  users.push(user);
  await writeUsers(users);
  return { user, verificationToken: verificationToken.value };
}

/**
 * Re-issue a verification token for a still-unverified user. Returns the
 * new token, or `null` if the user is already verified / doesn't exist.
 */
export async function reissueVerificationToken(
  email: string
): Promise<{ user: StoredCredentialUser; verificationToken: string } | null> {
  const users = await readUsers();
  const idx = users.findIndex(
    (u) => u.email === email.trim().toLowerCase()
  );
  if (idx === -1) return null;
  const user = users[idx];
  if (user.emailVerified) return null;
  const verificationToken = freshToken(VERIFICATION_TTL_MS);
  const updated: StoredCredentialUser = {
    ...user,
    emailVerificationToken: verificationToken,
    updatedAt: nowIso(),
  };
  users[idx] = updated;
  await writeUsers(users);
  return { user: updated, verificationToken: verificationToken.value };
}

export async function markEmailVerified(
  token: string
): Promise<StoredCredentialUser | null> {
  const users = await readUsers();
  const idx = users.findIndex(
    (u) =>
      u.emailVerificationToken?.value === token &&
      isTokenLive(u.emailVerificationToken)
  );
  if (idx === -1) return null;
  const updated: StoredCredentialUser = {
    ...users[idx],
    emailVerified: true,
    emailVerificationToken: null,
    updatedAt: nowIso(),
  };
  users[idx] = updated;
  await writeUsers(users);
  return updated;
}

export async function issuePasswordResetToken(
  email: string
): Promise<{ user: StoredCredentialUser; resetToken: string } | null> {
  const users = await readUsers();
  const idx = users.findIndex(
    (u) => u.email === email.trim().toLowerCase()
  );
  if (idx === -1) return null;
  const user = users[idx];
  // Operator must have set security questions to be eligible — otherwise
  // there's no challenge mechanism. Legacy users see a helpful error.
  if (user.securityQuestions.length < SECURITY_QUESTIONS_REQUIRED) {
    throw new Error("NO_SECURITY_QUESTIONS");
  }
  const resetToken = freshToken(RESET_TTL_MS);
  const updated: StoredCredentialUser = {
    ...user,
    passwordResetToken: resetToken,
    updatedAt: nowIso(),
  };
  users[idx] = updated;
  await writeUsers(users);
  return { user: updated, resetToken: resetToken.value };
}

export async function verifySecurityAnswers(
  user: StoredCredentialUser,
  answers: { id: string; answer: string }[]
): Promise<boolean> {
  if (answers.length < SECURITY_QUESTIONS_REQUIRED) return false;
  // All provided answers must be present + correct.
  for (const provided of answers) {
    const stored = user.securityQuestions.find((q) => q.id === provided.id);
    if (!stored) return false;
    const ok = await bcrypt.compare(
      normalizeAnswer(provided.answer),
      stored.answerHash
    );
    if (!ok) return false;
  }
  return true;
}

export async function resetPasswordWithToken(input: {
  token: string;
  answers: { id: string; answer: string }[];
  newPassword: string;
}): Promise<StoredCredentialUser | null> {
  if (input.newPassword.length < 8) throw new Error("PASSWORD_TOO_SHORT");
  const users = await readUsers();
  const idx = users.findIndex(
    (u) =>
      u.passwordResetToken?.value === input.token &&
      isTokenLive(u.passwordResetToken)
  );
  if (idx === -1) return null;
  const user = users[idx];
  const ok = await verifySecurityAnswers(user, input.answers);
  if (!ok) throw new Error("SECURITY_ANSWERS_INCORRECT");

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  const updated: StoredCredentialUser = {
    ...user,
    passwordHash,
    passwordResetToken: null,
    // A successful reset implies the email is owned by the operator.
    emailVerified: true,
    updatedAt: nowIso(),
  };
  users[idx] = updated;
  await writeUsers(users);
  return updated;
}

/**
 * Public-safe (no answerHash) version of a user's security questions —
 * enough for the recovery UI to render the prompts.
 */
export function publicSecurityQuestions(
  user: StoredCredentialUser
): { id: string; question: string }[] {
  return user.securityQuestions.map((q) => ({
    id: q.id,
    question: q.question,
  }));
}
