-- Per-user dashboard widget payloads (budget rows, VA invoices, vital dash, etc.)

create table if not exists public.user_node_widget_data (
  user_id text not null,
  widget_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, widget_key)
);

create index if not exists user_node_widget_data_user_idx
  on public.user_node_widget_data (user_id);

comment on table public.user_node_widget_data is
  'JSON payloads for node dashboard cards keyed by widget_key (e.g. home.budget, vanode.dashboard)';

alter table public.user_node_widget_data enable row level security;

drop policy if exists "user_node_widget_data_select" on public.user_node_widget_data;
drop policy if exists "user_node_widget_data_insert" on public.user_node_widget_data;
drop policy if exists "user_node_widget_data_update" on public.user_node_widget_data;
drop policy if exists "user_node_widget_data_delete" on public.user_node_widget_data;

create policy "user_node_widget_data_select"
  on public.user_node_widget_data for select
  to anon, authenticated
  using (true);

create policy "user_node_widget_data_insert"
  on public.user_node_widget_data for insert
  to anon, authenticated
  with check (true);

create policy "user_node_widget_data_update"
  on public.user_node_widget_data for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "user_node_widget_data_delete"
  on public.user_node_widget_data for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.user_node_widget_data to anon, authenticated;
