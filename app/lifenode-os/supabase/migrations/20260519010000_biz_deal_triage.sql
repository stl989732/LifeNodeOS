-- BizNode AI Deal-Triage Feed (lead micro-cards + Linos intent scoring).

create table if not exists public.biz_deal_triage (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source text not null default 'crm',
  lead_name text not null,
  intake_notes text not null default '',
  intent_label text not null,
  intent_level text not null default 'medium',
  stage text not null default 'intake',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists biz_deal_triage_user_created_idx
  on public.biz_deal_triage (user_id, created_at desc);

comment on table public.biz_deal_triage is 'BizNode deal triage feed — intent-scored lead cards';

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

grant select, insert, update on table public.biz_deal_triage to anon, authenticated;
