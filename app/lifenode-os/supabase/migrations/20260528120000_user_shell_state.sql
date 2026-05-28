-- Per-user shell state (hats, onboarding progress, workflows, notifications).
-- Accessed only via service role from API routes / server components.
create table if not exists public.user_shell_state (
  user_id text primary key,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_shell_state_updated_at_idx
  on public.user_shell_state (updated_at desc);

alter table public.user_shell_state enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.user_shell_state to service_role;
