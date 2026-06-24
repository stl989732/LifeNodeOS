-- lifenode_trackers: server-only via /api/life-pulse/trackers (NextAuth session).
-- Removes permissive anon/authenticated RLS flagged by security scanners.

drop policy if exists "lifenode_trackers_select" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_insert" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_update" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_delete" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_select_own" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_insert_own" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_update_own" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_delete_own" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_service_role_all" on public.lifenode_trackers;

revoke all on table public.lifenode_trackers from anon, authenticated;

create policy "lifenode_trackers_service_role_all"
  on public.lifenode_trackers
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.lifenode_trackers to service_role;
