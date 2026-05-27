import type { Session } from "next-auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

/**
 * `user_integrations.user_id` FK targets `auth.users(id)` in Supabase.
 * NextAuth session ids (credential file UUID or Google `sub`) are not
 * guaranteed to exist there — resolve or provision by session email.
 */
export async function resolveIntegrationUserId(
  session: Session | null,
): Promise<string | null> {
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const supabase = createSupabaseAdminClient();

  const existingId = await findAuthUserIdByEmail(supabase, email);
  if (existingId) return existingId;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      nextauth_user_id: session?.user?.id ?? null,
      name: session?.user?.name ?? null,
    },
  });

  if (data.user?.id) return data.user.id;

  if (error) {
    const retryId = await findAuthUserIdByEmail(supabase, email);
    if (retryId) return retryId;
    console.error("resolveIntegrationUserId createUser:", error);
    return null;
  }

  return null;
}

async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
): Promise<string | null> {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("resolveIntegrationUserId listUsers:", error);
      return null;
    }

    const match = data.users.find(
      (u) => u.email?.trim().toLowerCase() === email,
    );
    if (match?.id) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}
