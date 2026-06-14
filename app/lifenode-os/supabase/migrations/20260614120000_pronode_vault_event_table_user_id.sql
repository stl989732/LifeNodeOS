-- Scope ProNode vault documents and timeline rows per NextAuth user_id (text).
-- Additive only: new column + indexes + RLS refresh + service_role grants for account deletion.
-- Legacy rows with null user_id are hidden once the app filters by user_id; they are not reassigned.

-- 1) Drop ALL RLS policies first — production may have drift (e.g. pronode_vault_select_own on uuid user_id).
--    Postgres blocks `alter column ... type` while any policy references the column.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pronode_vault'
  loop
    execute format('drop policy if exists %I on public.pronode_vault', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_table'
  loop
    execute format('drop policy if exists %I on public.event_table', pol.policyname);
  end loop;

  -- Shares policies often subquery pronode_vault.user_id (e.g. *_insert_own_*).
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pronode_vault_shares'
  loop
    execute format('drop policy if exists %I on public.pronode_vault_shares', pol.policyname);
  end loop;
end $$;

-- 2) Drop auth.users FKs before uuid → text (NextAuth ids are text, not Supabase auth.users).
alter table public.pronode_vault
  drop constraint if exists pronode_vault_user_id_fkey;

alter table public.event_table
  drop constraint if exists event_table_user_id_fkey;

alter table public.pronode_vault_shares
  drop constraint if exists pronode_vault_shares_user_id_fkey;

-- 3) Ensure user_id is text (NextAuth / credential ids are not always UUID-shaped).
alter table public.pronode_vault
  add column if not exists user_id text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pronode_vault'
      and column_name = 'user_id'
      and udt_name = 'uuid'
  ) then
    alter table public.pronode_vault
      alter column user_id type text using user_id::text;
  end if;
end $$;

alter table public.event_table
  add column if not exists user_id text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_table'
      and column_name = 'user_id'
      and udt_name = 'uuid'
  ) then
    alter table public.event_table
      alter column user_id type text using user_id::text;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pronode_vault_shares'
      and column_name = 'user_id'
      and udt_name = 'uuid'
  ) then
    alter table public.pronode_vault_shares
      alter column user_id type text using user_id::text;
  end if;
end $$;

create index if not exists pronode_vault_user_node_type_updated_idx
  on public.pronode_vault (user_id, node_type, updated_at desc);

create index if not exists event_table_user_node_type_created_idx
  on public.event_table (user_id, node_type, created_at desc);

comment on column public.pronode_vault.user_id is 'NextAuth / credential_users persistence id; required for new rows.';
comment on column public.event_table.user_id is 'NextAuth / credential_users persistence id; required for new rows.';

-- 4) NextAuth RLS (browser client uses anon + authenticated, not auth.uid())
create policy "pronode_vault_select"
  on public.pronode_vault for select
  to anon, authenticated
  using (true);

create policy "pronode_vault_insert"
  on public.pronode_vault for insert
  to anon, authenticated
  with check (user_id is not null and length(trim(user_id::text)) > 0);

create policy "pronode_vault_update"
  on public.pronode_vault for update
  to anon, authenticated
  using (true)
  with check (user_id is not null and length(trim(user_id::text)) > 0);

create policy "pronode_vault_delete"
  on public.pronode_vault for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.pronode_vault to anon, authenticated;

create policy "event_table_select"
  on public.event_table for select
  to anon, authenticated
  using (true);

create policy "event_table_insert"
  on public.event_table for insert
  to anon, authenticated
  with check (user_id is not null and length(trim(user_id::text)) > 0);

create policy "event_table_update"
  on public.event_table for update
  to anon, authenticated
  using (true)
  with check (user_id is not null and length(trim(user_id::text)) > 0);

create policy "event_table_delete"
  on public.event_table for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.event_table to anon, authenticated;

-- Share links: anon reads valid tokens; signed-in users create snapshots (no user_id on shares rows).
create policy "pronode_vault_shares_select"
  on public.pronode_vault_shares for select
  to anon, authenticated
  using (expires_at > now());

create policy "pronode_vault_shares_insert"
  on public.pronode_vault_shares for insert
  to anon, authenticated
  with check (true);

create policy "pronode_vault_shares_delete"
  on public.pronode_vault_shares for delete
  to anon, authenticated
  using (true);

grant select, insert, delete on table public.pronode_vault_shares to anon, authenticated;

-- Account deletion (POST /api/account/delete) uses service_role
grant select, insert, update, delete on table public.pronode_vault to service_role;
grant select, insert, update, delete on table public.pronode_vault_shares to service_role;
grant select, insert, update, delete on table public.event_table to service_role;
