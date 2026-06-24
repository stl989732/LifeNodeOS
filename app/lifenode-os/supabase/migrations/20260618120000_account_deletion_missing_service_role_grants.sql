-- Account deletion (POST /api/account/delete) uses Supabase service_role.
-- Production was missing DML grants on event_table and pronode_vault_shares after partial
-- schema drift; without these, deleteUserAccount hits PostgreSQL 42501 (insufficient_privilege).
-- Additive grants only — no data changes.

grant select, insert, update, delete on table public.event_table to service_role;
grant select, insert, update, delete on table public.pronode_vault_shares to service_role;
