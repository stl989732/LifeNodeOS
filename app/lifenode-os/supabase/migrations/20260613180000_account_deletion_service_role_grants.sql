-- Account deletion (POST /api/account/delete) runs with Supabase service_role.
-- The Linos RLS migration granted anon/authenticated only; service_role lost table DML.
-- Additive grants only — no data changes.

grant select, insert, update, delete on table public.linos_chats to service_role;
grant select, insert, update, delete on table public.linos_messages to service_role;

grant select, insert, update, delete on table public.user_node_widget_data to service_role;
grant select, insert, update, delete on table public.user_integrations to service_role;
grant select, insert, update, delete on table public.lifenode_trackers to service_role;
grant select, insert, update, delete on table public.vital_health_metrics to service_role;
grant select, insert, update, delete on table public.family_events to service_role;

grant delete on table public.user_subscriptions to service_role;
grant delete on table public.ai_daily_usage to service_role;
grant delete on table public.daily_image_generation_caps to service_role;

grant select, insert, update, delete on table public.credential_users to service_role;
