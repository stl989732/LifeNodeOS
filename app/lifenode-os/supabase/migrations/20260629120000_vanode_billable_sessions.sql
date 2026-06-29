-- VANode billable hours / timetracker sessions (Sync+). Server-only via API routes.

create table if not exists public.vanode_billable_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  client_id text not null,
  client_name text not null,
  work_date date not null default ((now() at time zone 'utc')::date),
  status text not null default 'idle'
    check (status in ('idle', 'active', 'break_15', 'break_30', 'break_60', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  break_started_at timestamptz,
  break_ends_at timestamptz,
  accumulated_active_ms bigint not null default 0 check (accumulated_active_ms >= 0),
  accumulated_break_ms bigint not null default 0 check (accumulated_break_ms >= 0),
  event_log jsonb not null default '[]'::jsonb,
  share_token text unique,
  share_token_created_at timestamptz,
  vault_note_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vanode_billable_sessions_user_date_idx
  on public.vanode_billable_sessions (user_id, work_date desc);

create index if not exists vanode_billable_sessions_share_token_idx
  on public.vanode_billable_sessions (share_token)
  where share_token is not null;

comment on table public.vanode_billable_sessions is
  'Immutable-append billable time sessions per VANode client. Mutations via Next.js API only.';

alter table public.vanode_billable_sessions enable row level security;

drop policy if exists "vanode_billable_sessions_service_role_all" on public.vanode_billable_sessions;

revoke all on table public.vanode_billable_sessions from anon, authenticated;

create policy "vanode_billable_sessions_service_role_all"
  on public.vanode_billable_sessions
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.vanode_billable_sessions to service_role;
