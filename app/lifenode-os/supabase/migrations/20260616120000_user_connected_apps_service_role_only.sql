-- user_connected_apps: server-only via /api/integrations/connected-apps (NextAuth session).
-- Removes permissive anon SELECT (using true) now that useConnectedApps uses the API.

drop policy if exists "user_connected_apps_select" on public.user_connected_apps;
drop policy if exists "user_connected_apps_insert" on public.user_connected_apps;
drop policy if exists "user_connected_apps_update" on public.user_connected_apps;
drop policy if exists "user_connected_apps_delete" on public.user_connected_apps;

revoke all on table public.user_connected_apps from anon, authenticated;

grant select, insert, update, delete on table public.user_connected_apps to service_role;
