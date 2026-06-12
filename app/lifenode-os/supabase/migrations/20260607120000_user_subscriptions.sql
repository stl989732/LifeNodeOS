-- Per-user billing plan (Core default; Sync/Nexus via Lemon Squeezy webhooks).

create table if not exists public.user_subscriptions (
  user_id text primary key,
  plan text not null default 'core'
    check (plan in ('core', 'sync', 'nexus')),
  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled', 'expired')),
  lemon_customer_id text,
  lemon_subscription_id text,
  variant_slug text,
  current_period_end timestamptz,
  past_due_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_lemon_subscription_id_key unique (lemon_subscription_id)
);

create index if not exists user_subscriptions_plan_idx
  on public.user_subscriptions (plan);

create index if not exists user_subscriptions_lemon_customer_id_idx
  on public.user_subscriptions (lemon_customer_id)
  where lemon_customer_id is not null;

comment on table public.user_subscriptions is
  'Billing plan per NextAuth user. Core by default; updated via Lemon Squeezy webhooks.';

alter table public.user_subscriptions enable row level security;

revoke all on table public.user_subscriptions from public;
grant select, insert, update on table public.user_subscriptions to service_role;
