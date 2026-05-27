-- VitalNode: structured health metrics stream (wearables / recovery sync).

create table if not exists public.vital_health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  metric_date date not null,
  sleep_score int4,
  readiness_score int4,
  active_calories int4,
  hrv int4,
  raw_json_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists vital_health_metrics_user_date_uidx
  on public.vital_health_metrics (user_id, metric_date);

create index if not exists vital_health_metrics_user_created_idx
  on public.vital_health_metrics (user_id, metric_date desc);

comment on table public.vital_health_metrics is 'VitalNode daily health metrics — sleep, readiness, activity, HRV';

alter table public.vital_health_metrics enable row level security;

drop policy if exists "vital_health_metrics_select" on public.vital_health_metrics;
drop policy if exists "vital_health_metrics_insert" on public.vital_health_metrics;
drop policy if exists "vital_health_metrics_update" on public.vital_health_metrics;

create policy "vital_health_metrics_select"
  on public.vital_health_metrics for select
  to anon, authenticated
  using (true);

create policy "vital_health_metrics_insert"
  on public.vital_health_metrics for insert
  to anon, authenticated
  with check (true);

create policy "vital_health_metrics_update"
  on public.vital_health_metrics for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on table public.vital_health_metrics to anon, authenticated;
