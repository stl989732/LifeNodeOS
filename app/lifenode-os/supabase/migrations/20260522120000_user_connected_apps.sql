-- Per-node app connection UI state (BizNode / VANode cards). OAuth tokens live in user_integrations.
create table if not exists public.user_connected_apps (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  target_node text not null,
  app_id text not null,
  connection_status text not null default 'disconnected',
  last_sync timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, target_node, app_id),
  constraint user_connected_apps_status_check
    check (connection_status in ('connected', 'syncing', 'disconnected'))
);

create index if not exists user_connected_apps_user_id_idx
  on public.user_connected_apps (user_id);

alter table public.user_connected_apps enable row level security;

drop policy if exists "user_connected_apps_select" on public.user_connected_apps;
drop policy if exists "user_connected_apps_insert" on public.user_connected_apps;
drop policy if exists "user_connected_apps_update" on public.user_connected_apps;
drop policy if exists "user_connected_apps_delete" on public.user_connected_apps;

-- NextAuth user_id (text) + anon key — same pattern as lifenode_trackers.
create policy "user_connected_apps_select"
  on public.user_connected_apps for select
  to anon, authenticated
  using (true);

create policy "user_connected_apps_insert"
  on public.user_connected_apps for insert
  to anon, authenticated
  with check (
    user_id is not null
    and length(trim(user_id::text)) > 0
  );

create policy "user_connected_apps_update"
  on public.user_connected_apps for update
  to anon, authenticated
  using (true)
  with check (
    user_id is not null
    and length(trim(user_id::text)) > 0
  );

create policy "user_connected_apps_delete"
  on public.user_connected_apps for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.user_connected_apps to anon, authenticated, service_role;
