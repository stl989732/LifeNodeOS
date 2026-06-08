-- Align live user_connected_apps with app code (NextAuth text user_id).
-- Fixes drift: uuid user_id, missing updated_at, auth.uid() policies that block NextAuth clients.

-- 1. Drop policies before altering columns they reference
alter table public.user_connected_apps enable row level security;

drop policy if exists "user_connected_apps_select" on public.user_connected_apps;
drop policy if exists "user_connected_apps_insert" on public.user_connected_apps;
drop policy if exists "user_connected_apps_update" on public.user_connected_apps;
drop policy if exists "user_connected_apps_delete" on public.user_connected_apps;
drop policy if exists "user_connected_apps_delete_own_authenticated" on public.user_connected_apps;
drop policy if exists "user_connected_apps_update_own_authenticated" on public.user_connected_apps;

-- 2. Column types and constraints
alter table public.user_connected_apps
  alter column user_id type text using user_id::text;

alter table public.user_connected_apps
  alter column target_node type text using target_node::text;

alter table public.user_connected_apps
  alter column app_id type text using app_id::text;

alter table public.user_connected_apps
  alter column connection_status type text using connection_status::text;

alter table public.user_connected_apps
  alter column connection_status set not null;

alter table public.user_connected_apps
  alter column connection_status set default 'disconnected';

alter table public.user_connected_apps
  alter column created_at set not null;

alter table public.user_connected_apps
  alter column created_at set default now();

alter table public.user_connected_apps
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_connected_apps
  alter column last_sync drop default;

alter table public.user_connected_apps
  drop constraint if exists user_connected_apps_status_check;

alter table public.user_connected_apps
  add constraint user_connected_apps_status_check
  check (connection_status in ('connected', 'syncing', 'disconnected'));

-- 3. RLS — NextAuth user_id (text) + anon key; same pattern as lifenode_trackers.
create policy "user_connected_apps_select"
  on public.user_connected_apps for select
  to anon, authenticated
  using (true);

create policy "user_connected_apps_insert"
  on public.user_connected_apps for insert
  to anon, authenticated
  with check (
    user_id is not null
    and length(trim(user_id)) > 0
  );

create policy "user_connected_apps_update"
  on public.user_connected_apps for update
  to anon, authenticated
  using (true)
  with check (
    user_id is not null
    and length(trim(user_id)) > 0
  );

create policy "user_connected_apps_delete"
  on public.user_connected_apps for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.user_connected_apps to anon, authenticated, service_role;
