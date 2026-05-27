-- Email/password accounts for NextAuth credentials provider (server-only via service role).
create table if not exists public.credential_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  name text,
  email_verified boolean not null default false,
  email_verification_token jsonb,
  password_reset_token jsonb,
  security_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credential_users_email_unique unique (email)
);

create index if not exists credential_users_email_idx
  on public.credential_users (lower(email));

alter table public.credential_users enable row level security;

-- No anon/authenticated policies: only the service role (API routes) may access.
