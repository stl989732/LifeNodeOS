/**
 * Server-only admin gate. Set in `app/lifenode-os/.env.local` (never NEXT_PUBLIC_*):
 *
 *   LIFENODE_ADMIN_EMAILS=you@example.com,other@example.com
 *   LIFENODE_ADMIN_USER_IDS=<uuid>,<uuid>
 */
function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUser(input: {
  userId?: string | null;
  email?: string | null;
}): boolean {
  const idAllow = parseAllowlist(process.env.LIFENODE_ADMIN_USER_IDS);
  const emailAllow = parseAllowlist(process.env.LIFENODE_ADMIN_EMAILS);

  if (idAllow.size === 0 && emailAllow.size === 0) {
    return false;
  }

  const userId = input.userId?.trim();
  if (userId && idAllow.has(userId.toLowerCase())) {
    return true;
  }

  const email = input.email?.trim().toLowerCase();
  if (email && emailAllow.has(email)) {
    return true;
  }

  return false;
}
