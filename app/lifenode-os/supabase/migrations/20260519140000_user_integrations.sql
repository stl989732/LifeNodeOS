-- OAuth tokens for third-party integrations (HubSpot, Google Calendar, etc.)
create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider_name text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider_name)
);

create index if not exists user_integrations_user_id_idx
  on public.user_integrations (user_id);

-- Tokens are only read/written from Next.js route handlers (service role).
alter table public.user_integrations enable row level security;
