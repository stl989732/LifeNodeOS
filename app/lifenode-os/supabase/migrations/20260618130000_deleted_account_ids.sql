-- Tombstone ids after POST /api/account/delete so other devices invalidate JWT sessions.
-- Additive only — no user data removed from existing tables.

create table if not exists public.deleted_account_ids (
  user_id text primary key,
  deleted_at timestamptz not null default now()
);

create index if not exists deleted_account_ids_deleted_at_idx
  on public.deleted_account_ids (deleted_at desc);

comment on table public.deleted_account_ids is
  'Ids permanently deleted via account deletion; checked on every session refresh.';

alter table public.deleted_account_ids enable row level security;

grant select, insert, update, delete on table public.deleted_account_ids to service_role;
