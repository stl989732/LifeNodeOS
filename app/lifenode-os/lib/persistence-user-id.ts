import type { Session } from "next-auth";
import { findCredentialUserByEmail } from "@/lib/auth-users-store";
import {
  getUserState,
  type UserState,
  writeUserStateDirect,
} from "@/lib/user-state-store";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

function isEmptyUserState(state: UserState): boolean {
  const onboardingDone = Object.values(state.nodeOnboarding).some(
    (row) => row?.onboardingCompleted,
  );
  return (
    state.configuredHats.length === 0 &&
    !onboardingDone &&
    state.workflows.length === 0
  );
}

function shellStateNeedsLegacyHatMerge(
  canonical: UserState,
  legacy: UserState,
): boolean {
  return (
    canonical.configuredHats.length === 0 && legacy.configuredHats.length > 0
  );
}

/**
 * One stable id for shell state, onboarding, and node widgets.
 * Prefer the credential_users row when the email matches so Google/GitHub
 * sign-in on mobile loads the same data as email/password sign-up.
 */
export async function resolvePersistenceUserId(
  session: Session | null | undefined,
): Promise<string | null> {
  const rawId = session?.user?.id?.trim();
  if (!rawId) return null;

  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return rawId;

  try {
    const cred = await findCredentialUserByEmail(email);
    if (cred?.id) return cred.id;
  } catch (e) {
    console.error("[persistence-user-id] credential lookup failed:", e);
  }

  return rawId;
}

/** OAuth provider subject when it differs from the canonical persistence id. */
function legacyUserIdFromSession(
  session: Session | null | undefined,
): string | null {
  const legacy = session?.user?.legacyUserId?.trim();
  return legacy || null;
}

/**
 * Copy shell + widget rows from an OAuth-only id onto the credential id once,
 * so switching sign-in methods on mobile does not look like a wiped account.
 */
export async function migrateLegacyPersistenceIfNeeded(
  canonicalUserId: string,
  legacyUserId: string | null | undefined,
): Promise<void> {
  if (!legacyUserId || legacyUserId === canonicalUserId) return;

  try {
    const canonical = await getUserState(canonicalUserId);
    const legacy = await getUserState(legacyUserId);
    if (isEmptyUserState(legacy)) return;

    if (shellStateNeedsLegacyHatMerge(canonical, legacy)) {
      await writeUserStateDirect({
        ...canonical,
        configuredHats: legacy.configuredHats,
        lastActiveNode: canonical.lastActiveNode ?? legacy.lastActiveNode,
        nodeOnboarding:
          Object.keys(canonical.nodeOnboarding).length > 0
            ? canonical.nodeOnboarding
            : legacy.nodeOnboarding,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (!isEmptyUserState(canonical)) return;

    await writeUserStateDirect({
      ...legacy,
      userId: canonicalUserId,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[persistence-user-id] shell state migration failed:", e);
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_KEY?.trim()
    )
  ) {
    return;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const canonicalKey = sanitizeUserId(canonicalUserId);
    const legacyKey = sanitizeUserId(legacyUserId);

    const { data: legacyRows, error: readErr } = await supabase
      .from("user_node_widget_data")
      .select("widget_key, payload, updated_at")
      .eq("user_id", legacyKey);

    if (readErr || !legacyRows?.length) return;

    const { data: canonicalRows, error: canonicalReadErr } = await supabase
      .from("user_node_widget_data")
      .select("widget_key, updated_at")
      .eq("user_id", canonicalKey);

    if (canonicalReadErr) {
      console.error(
        "[persistence-user-id] canonical widget read failed:",
        canonicalReadErr,
      );
      return;
    }

    const canonicalByKey = new Map(
      (canonicalRows ?? []).map((row) => [
        row.widget_key,
        typeof row.updated_at === "string" ? row.updated_at : null,
      ]),
    );

    const upserts = legacyRows
      .filter((row) => {
        const canonicalUpdatedAt = canonicalByKey.get(row.widget_key);
        if (!canonicalUpdatedAt) return true;
        const legacyUpdatedAt =
          typeof row.updated_at === "string" ? row.updated_at : null;
        if (!legacyUpdatedAt) return false;
        return Date.parse(legacyUpdatedAt) > Date.parse(canonicalUpdatedAt);
      })
      .map((row) => ({
        user_id: canonicalKey,
        widget_key: row.widget_key,
        payload: row.payload,
        updated_at: row.updated_at ?? new Date().toISOString(),
      }));

    if (!upserts.length) return;

    const { error: upsertErr } = await supabase
      .from("user_node_widget_data")
      .upsert(upserts, { onConflict: "user_id,widget_key" });

    if (upsertErr) {
      console.error("[persistence-user-id] widget migration failed:", upsertErr);
    }
  } catch (e) {
    console.error("[persistence-user-id] widget migration failed:", e);
  }
}

export async function resolveSessionPersistence(
  session: Session | null | undefined,
): Promise<{ userId: string; legacyUserId: string | null } | null> {
  const userId = await resolvePersistenceUserId(session);
  if (!userId) return null;

  const legacyUserId = legacyUserIdFromSession(session);
  await migrateLegacyPersistenceIfNeeded(userId, legacyUserId);

  return {
    userId,
    legacyUserId:
      legacyUserId && legacyUserId !== userId ? legacyUserId : null,
  };
}
