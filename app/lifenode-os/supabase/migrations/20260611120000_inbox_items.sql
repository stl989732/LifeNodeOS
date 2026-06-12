-- Shell inbox orchestrator: normalized items from Gmail, Slack, Google Calendar.

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source text not null,
  external_id text not null,
  kind text not null,
  title text not null default '',
  snippet text not null default '',
  body text,
  from_label text,
  from_id text,
  received_at timestamptz not null,
  status text not null default 'inbox',
  transfer_meta jsonb not null default '{}'::jsonb,
  provider_payload jsonb not null default '{}'::jsonb,
  local_notes text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id),
  constraint inbox_items_source_check
    check (source in ('gmail', 'slack', 'google_calendar')),
  constraint inbox_items_kind_check
    check (kind in ('email', 'slack_message', 'calendar_event')),
  constraint inbox_items_status_check
    check (status in ('inbox', 'scheduled', 'archived', 'transferred', 'backlog'))
);

create index if not exists inbox_items_user_received_idx
  on public.inbox_items (user_id, received_at desc);

create index if not exists inbox_items_user_status_idx
  on public.inbox_items (user_id, status);

comment on table public.inbox_items is 'Shell unified inbox — normalized cross-app feed items';

alter table public.inbox_items enable row level security;

drop policy if exists "inbox_items_select" on public.inbox_items;
drop policy if exists "inbox_items_insert" on public.inbox_items;
drop policy if exists "inbox_items_update" on public.inbox_items;
drop policy if exists "inbox_items_delete" on public.inbox_items;

create policy "inbox_items_select"
  on public.inbox_items for select
  to anon, authenticated
  using (true);

create policy "inbox_items_insert"
  on public.inbox_items for insert
  to anon, authenticated
  with check (
    user_id is not null
    and length(trim(user_id::text)) > 0
  );

create policy "inbox_items_update"
  on public.inbox_items for update
  to anon, authenticated
  using (true)
  with check (
    user_id is not null
    and length(trim(user_id::text)) > 0
  );

create policy "inbox_items_delete"
  on public.inbox_items for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.inbox_items to anon, authenticated, service_role;
