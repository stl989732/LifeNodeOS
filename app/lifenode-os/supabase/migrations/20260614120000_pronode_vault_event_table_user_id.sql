-- Scope ProNode vault documents and timeline rows per NextAuth user_id (text).
-- Additive only: new column + indexes + RLS refresh + service_role grants for account deletion.
-- Legacy rows with null user_id are hidden once the app filters by user_id; they are not reassigned.

alter table public.pronode_vault
  add column if not exists user_id text;

alter table public.event_table
  add column if not exists user_id text;

create index if not exists pronode_vault_user_node_type_updated_idx
  on public.pronode_vault (user_id, node_type, updated_at desc);

create index if not exists event_table_user_node_type_created_idx
  on public.event_table (user_id, node_type, created_at desc);

comment on column public.pronode_vault.user_id is 'NextAuth / credential_users persistence id; required for new rows.';
comment on column public.event_table.user_id is 'NextAuth / credential_users persistence id; required for new rows.';

-- pronode_vault RLS (NextAuth browser client uses anon + authenticated, not auth.uid())
drop policy if exists "pronode_vault_select_authenticated" on public.pronode_vault;
drop policy if exists "pronode_vault_write_authenticated" on public.pronode_vault;

create policy "pronode_vault_select"
  on public.pronode_vault for select
  to anon, authenticated
  using (true);

create policy "pronode_vault_insert"
  on public.pronode_vault for insert
  to anon, authenticated
  with check (user_id is not null and length(trim(user_id)) > 0);

create policy "pronode_vault_update"
  on public.pronode_vault for update
  to anon, authenticated
  using (true)
  with check (user_id is not null and length(trim(user_id)) > 0);

create policy "pronode_vault_delete"
  on public.pronode_vault for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.pronode_vault to anon, authenticated;

-- event_table RLS
drop policy if exists "event_table_select_authenticated" on public.event_table;
drop policy if exists "event_table_write_authenticated" on public.event_table;

create policy "event_table_select"
  on public.event_table for select
  to anon, authenticated
  using (true);

create policy "event_table_insert"
  on public.event_table for insert
  to anon, authenticated
  with check (user_id is not null and length(trim(user_id)) > 0);

create policy "event_table_update"
  on public.event_table for update
  to anon, authenticated
  using (true)
  with check (user_id is not null and length(trim(user_id)) > 0);

create policy "event_table_delete"
  on public.event_table for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.event_table to anon, authenticated;

-- Account deletion (POST /api/account/delete) uses service_role
grant select, insert, update, delete on table public.pronode_vault to service_role;
grant select, insert, update, delete on table public.pronode_vault_shares to service_role;
grant select, insert, update, delete on table public.event_table to service_role;
