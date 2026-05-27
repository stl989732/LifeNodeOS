-- =============================================================================
-- LifePulse: lifenode_trackers — paste into Supabase SQL Editor → Run
-- =============================================================================

create table if not exists public.lifenode_trackers (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  category text not null,
  title text not null,
  target_date timestamptz,
  status text not null default 'active',
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists lifenode_trackers_user_category_idx
  on public.lifenode_trackers (user_id, category, created_at desc);

create index if not exists lifenode_trackers_user_id_idx
  on public.lifenode_trackers (user_id);

comment on table public.lifenode_trackers is
  'LifePulse trackers — Travel, Business, Skincare, Pets, etc.';

create or replace function public.lifenode_trackers_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists lifenode_trackers_updated_at on public.lifenode_trackers;
create trigger lifenode_trackers_updated_at
  before update on public.lifenode_trackers
  for each row execute function public.lifenode_trackers_set_updated_at();

alter table public.lifenode_trackers enable row level security;

drop policy if exists "lifenode_trackers_select_own" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_insert_own" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_update_own" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_delete_own" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_select" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_insert" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_update" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_delete" on public.lifenode_trackers;

-- LifeNode OS uses NextAuth (text user_id) + browser anon key.
-- The app always queries with .eq('user_id', session.user.id).
-- These policies allow CRUD; enforce owner scope in application code.
-- (Same pattern as linos_chats in this project.)

create policy "lifenode_trackers_select"
  on public.lifenode_trackers for select
  to anon, authenticated
  using (true);

create policy "lifenode_trackers_insert"
  on public.lifenode_trackers for insert
  to anon, authenticated
  with check (user_id is not null and length(trim(user_id)) > 0);

create policy "lifenode_trackers_update"
  on public.lifenode_trackers for update
  to anon, authenticated
  using (true)
  with check (user_id is not null and length(trim(user_id)) > 0);

create policy "lifenode_trackers_delete"
  on public.lifenode_trackers for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.lifenode_trackers to anon, authenticated;

-- Optional: strict JWT owner policies (when Supabase JWT sub = user_id)
-- drop policies above, then run:
--
-- create policy "lifenode_trackers_select_own" on public.lifenode_trackers
--   for select using (user_id = (auth.jwt() ->> 'sub'));
-- create policy "lifenode_trackers_insert_own" on public.lifenode_trackers
--   for insert with check (user_id = (auth.jwt() ->> 'sub'));
-- create policy "lifenode_trackers_update_own" on public.lifenode_trackers
--   for update using (user_id = (auth.jwt() ->> 'sub'));
-- create policy "lifenode_trackers_delete_own" on public.lifenode_trackers
--   for delete using (user_id = (auth.jwt() ->> 'sub'));
