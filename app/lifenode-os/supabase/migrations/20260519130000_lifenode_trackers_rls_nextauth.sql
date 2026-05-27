-- Optional: use if you prefer browser-side Supabase without service_role.
-- NextAuth user_id (text) + anon key — NOT auth.uid().

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
