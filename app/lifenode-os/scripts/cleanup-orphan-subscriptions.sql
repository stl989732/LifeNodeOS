-- Remove user_subscriptions rows whose user_id has no matching auth.users row
-- and no email in credential_users (admin "No email" orphan rows).
-- Run manually in Supabase SQL editor or via service role only.

DELETE FROM public.user_subscriptions us
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id::text = us.user_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.credential_users cu
  WHERE cu.id::text = us.user_id
    AND cu.email IS NOT NULL
    AND btrim(cu.email) <> ''
);
