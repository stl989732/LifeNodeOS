-- LifePulse: modular lifestyle & execution trackers (NextAuth user_id as text).

create table if not exists public.lifenode_trackers (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  category text not null,
  title text not null,
  target_date timestamptz,
  status text not null default 'active',
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists lifenode_trackers_user_category_idx
  on public.lifenode_trackers (user_id, category, created_at desc);

comment on table public.lifenode_trackers is 'LifePulse trackers — category + flexible metrics JSONB';

alter table public.lifenode_trackers enable row level security;

drop policy if exists "lifenode_trackers_select" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_insert" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_update" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_delete" on public.lifenode_trackers;

create policy "lifenode_trackers_select"
  on public.lifenode_trackers for select
  to anon, authenticated
  using (true);

create policy "lifenode_trackers_insert"
  on public.lifenode_trackers for insert
  to anon, authenticated
  with check (true);

create policy "lifenode_trackers_update"
  on public.lifenode_trackers for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "lifenode_trackers_delete"
  on public.lifenode_trackers for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.lifenode_trackers to anon, authenticated;
