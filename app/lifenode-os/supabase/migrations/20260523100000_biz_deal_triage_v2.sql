-- BizNode AI Deal-Triage Feed v2 — matches /api/triage insert shape.
-- Safe to run after manual Supabase SQL; uses IF NOT EXISTS / policy drops.

create table if not exists public.biz_deal_triage (
  id uuid primary key default gen_random_uuid(),
  user_id text null,
  node_owner varchar(50) not null default 'BIZ',
  source_provider varchar(100) not null default 'MANUAL_INTAKE',
  raw_notes_or_payload text not null default '',
  kanban_column varchar(50) not null default 'inbound_queue',
  status varchar(50) not null default 'triaged',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists biz_deal_triage_user_created_idx
  on public.biz_deal_triage (user_id, created_at desc);

alter table public.biz_deal_triage enable row level security;

drop policy if exists "biz_deal_triage_select" on public.biz_deal_triage;
drop policy if exists "biz_deal_triage_insert" on public.biz_deal_triage;
drop policy if exists "biz_deal_triage_update" on public.biz_deal_triage;

create policy "biz_deal_triage_select"
  on public.biz_deal_triage for select
  to anon, authenticated
  using (true);

create policy "biz_deal_triage_insert"
  on public.biz_deal_triage for insert
  to anon, authenticated
  with check (true);

create policy "biz_deal_triage_update"
  on public.biz_deal_triage for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.biz_deal_triage to anon, authenticated, service_role;
