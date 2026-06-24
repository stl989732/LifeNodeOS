-- lifenode_trackers: server-only via /api/life-pulse/trackers (NextAuth session).
-- Removes permissive anon SELECT/UPDATE/DELETE (using true) flagged by security scanners.

drop policy if exists "lifenode_trackers_select" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_insert" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_update" on public.lifenode_trackers;
drop policy if exists "lifenode_trackers_delete" on public.lifenode_trackers;

revoke all on table public.lifenode_trackers from anon, authenticated;

grant select, insert, update, delete on table public.lifenode_trackers to service_role;
