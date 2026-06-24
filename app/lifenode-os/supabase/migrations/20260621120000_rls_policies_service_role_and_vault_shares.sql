-- RLS policies for tables flagged by Supabase advisor (RLS on, zero policies).
-- NextAuth: server API routes use service_role only for billing, Linos, AI metering, tombstones.
-- ProNode vault shares: browser anon client for time-limited public share URLs.

-- -----------------------------------------------------------------------------
-- ai_daily_usage — server-only (/api/* metering via service_role + RPC)
-- -----------------------------------------------------------------------------
drop policy if exists "ai_daily_usage_service_role_all" on public.ai_daily_usage;

create policy "ai_daily_usage_service_role_all"
  on public.ai_daily_usage
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- deleted_account_ids — server-only (session tombstones after account delete)
-- -----------------------------------------------------------------------------
drop policy if exists "deleted_account_ids_service_role_all" on public.deleted_account_ids;

create policy "deleted_account_ids_service_role_all"
  on public.deleted_account_ids
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- user_subscriptions — server-only (Lemon Squeezy webhooks + billing API)
-- -----------------------------------------------------------------------------
drop policy if exists "user_subscriptions_service_role_all" on public.user_subscriptions;

create policy "user_subscriptions_service_role_all"
  on public.user_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- linos_chats / linos_messages — server-only (/api/linos/*)
-- -----------------------------------------------------------------------------
drop policy if exists "linos_chats_service_role_all" on public.linos_chats;
drop policy if exists "linos_messages_service_role_all" on public.linos_messages;

create policy "linos_chats_service_role_all"
  on public.linos_chats
  for all
  to service_role
  using (true)
  with check (true);

create policy "linos_messages_service_role_all"
  on public.linos_messages
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- pronode_vault_shares — anon read valid tokens; create/delete from ProNode UI
-- -----------------------------------------------------------------------------
drop policy if exists "pronode_vault_shares_select" on public.pronode_vault_shares;
drop policy if exists "pronode_vault_shares_insert" on public.pronode_vault_shares;
drop policy if exists "pronode_vault_shares_delete" on public.pronode_vault_shares;
drop policy if exists "pronode_vault_shares_select_valid_anon" on public.pronode_vault_shares;
drop policy if exists "pronode_vault_shares_insert_authenticated" on public.pronode_vault_shares;
drop policy if exists "pronode_vault_shares_service_role_all" on public.pronode_vault_shares;

create policy "pronode_vault_shares_select"
  on public.pronode_vault_shares
  for select
  to anon, authenticated
  using (expires_at > now());

create policy "pronode_vault_shares_insert"
  on public.pronode_vault_shares
  for insert
  to anon, authenticated
  with check (true);

create policy "pronode_vault_shares_delete"
  on public.pronode_vault_shares
  for delete
  to anon, authenticated
  using (true);

create policy "pronode_vault_shares_service_role_all"
  on public.pronode_vault_shares
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, delete on table public.pronode_vault_shares to anon, authenticated;
