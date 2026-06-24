-- Tighten permissive RLS flagged by Supabase advisor.
-- NextAuth: browser anon key cannot bind auth.uid(); enforce ownership in API routes
-- with service_role. Public vault share links keep SELECT on non-expired rows only.

-- -----------------------------------------------------------------------------
-- inbox_items — server-only (/api/inbox/* + inboxDb.ts)
-- -----------------------------------------------------------------------------
drop policy if exists "inbox_items_select" on public.inbox_items;
drop policy if exists "inbox_items_insert" on public.inbox_items;
drop policy if exists "inbox_items_update" on public.inbox_items;
drop policy if exists "inbox_items_delete" on public.inbox_items;
drop policy if exists "inbox_items_service_role_all" on public.inbox_items;

revoke all on table public.inbox_items from anon, authenticated;

create policy "inbox_items_service_role_all"
  on public.inbox_items
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.inbox_items to service_role;

-- -----------------------------------------------------------------------------
-- pronode_vault — server-only (/api/pro/vault/*)
-- -----------------------------------------------------------------------------
drop policy if exists "pronode_vault_select" on public.pronode_vault;
drop policy if exists "pronode_vault_insert" on public.pronode_vault;
drop policy if exists "pronode_vault_update" on public.pronode_vault;
drop policy if exists "pronode_vault_delete" on public.pronode_vault;
drop policy if exists "pronode_vault_select_authenticated" on public.pronode_vault;
drop policy if exists "pronode_vault_write_authenticated" on public.pronode_vault;
drop policy if exists "pronode_vault_service_role_all" on public.pronode_vault;

revoke all on table public.pronode_vault from anon, authenticated;

create policy "pronode_vault_service_role_all"
  on public.pronode_vault
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.pronode_vault to service_role;

-- -----------------------------------------------------------------------------
-- pronode_vault_shares — public read valid tokens; mutations via API + service_role
-- -----------------------------------------------------------------------------
drop policy if exists "pronode_vault_shares_insert" on public.pronode_vault_shares;
drop policy if exists "pronode_vault_shares_delete" on public.pronode_vault_shares;
drop policy if exists "pronode_vault_shares_insert_authenticated" on public.pronode_vault_shares;
drop policy if exists "pronode_vault_shares_service_role_all" on public.pronode_vault_shares;

revoke insert, delete on table public.pronode_vault_shares from anon, authenticated;

create policy "pronode_vault_shares_service_role_all"
  on public.pronode_vault_shares
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.pronode_vault_shares to service_role;
