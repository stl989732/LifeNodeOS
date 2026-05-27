-- ProNode Auto-Timeline events (scoped by node_type per profession workspace).

create table if not exists public.event_table (
  id uuid primary key default gen_random_uuid(),
  node_type text not null,
  source text not null default 'system',
  title text not null,
  excerpt text not null default '',
  fact text,
  case_id text,
  video_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists event_table_node_type_created_idx
  on public.event_table (node_type, created_at desc);

comment on table public.event_table is 'ProNode Auto-Timeline rows; filter by node_type for workspace isolation.';

alter table public.event_table enable row level security;

create policy "event_table_select_authenticated"
  on public.event_table for select
  to authenticated
  using (true);

create policy "event_table_write_authenticated"
  on public.event_table for all
  to authenticated
  using (true)
  with check (true);
