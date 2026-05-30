-- HomeNode daily schedule items (synced from calendars, email parsers, etc.)

create table if not exists public.family_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  event_time timestamptz not null,
  category text not null default 'home',
  event_date date not null,
  source text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists family_events_user_date_idx
  on public.family_events (user_id, event_date, event_time);

comment on table public.family_events is 'Per-user daily schedule rows for HomeNode command deck';

alter table public.family_events enable row level security;

drop policy if exists "family_events_select" on public.family_events;
drop policy if exists "family_events_insert" on public.family_events;
drop policy if exists "family_events_update" on public.family_events;
drop policy if exists "family_events_delete" on public.family_events;

create policy "family_events_select"
  on public.family_events for select
  to anon, authenticated
  using (true);

create policy "family_events_insert"
  on public.family_events for insert
  to anon, authenticated
  with check (true);

create policy "family_events_update"
  on public.family_events for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "family_events_delete"
  on public.family_events for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.family_events to anon, authenticated;
