-- LifePulse v2: nested tasks, progress ring, dates, priority, context_data

alter table public.lifenode_trackers
  add column if not exists parent_id uuid references public.lifenode_trackers (id) on delete cascade,
  add column if not exists progress_percent smallint not null default 0
    check (progress_percent >= 0 and progress_percent <= 100),
  add column if not exists start_date timestamptz,
  add column if not exists due_date timestamptz,
  add column if not exists priority text not null default 'medium',
  add column if not exists context_data jsonb not null default '{}'::jsonb;

-- Backfill from legacy columns
update public.lifenode_trackers
set due_date = target_date
where due_date is null and target_date is not null;

update public.lifenode_trackers
set context_data = metrics
where context_data = '{}'::jsonb
  and metrics is not null
  and metrics::text <> '{}';

create index if not exists lifenode_trackers_parent_idx
  on public.lifenode_trackers (parent_id);

create index if not exists lifenode_trackers_due_date_idx
  on public.lifenode_trackers (user_id, due_date);

comment on column public.lifenode_trackers.progress_percent is
  '0% Calm State baseline — drives completion ring in LifePulse UI';
