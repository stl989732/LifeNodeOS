-- Site-wide page view / unique visitor rollups for Admin dashboard.

create table if not exists public.web_app_daily_stats (
  view_date date primary key,
  page_views bigint not null default 0 check (page_views >= 0),
  unique_visitors bigint not null default 0 check (unique_visitors >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.web_app_daily_stats is
  'UTC-day totals for LifeNode OS web app page views and unique visitors.';

create table if not exists public.web_app_daily_visitors (
  view_date date not null,
  visitor_key text not null,
  first_seen_at timestamptz not null default now(),
  primary key (view_date, visitor_key)
);

comment on table public.web_app_daily_visitors is
  'Per-day visitor keys used to approximate unique people who viewed the web app.';

create index if not exists web_app_daily_visitors_view_date_idx
  on public.web_app_daily_visitors (view_date);

alter table public.web_app_daily_stats enable row level security;
alter table public.web_app_daily_visitors enable row level security;

-- Service role only (Next.js admin client). No anon/authenticated policies.
revoke all on table public.web_app_daily_stats from anon, authenticated;
revoke all on table public.web_app_daily_visitors from anon, authenticated;
grant all on table public.web_app_daily_stats to service_role;
grant all on table public.web_app_daily_visitors to service_role;

create or replace function public.record_web_app_page_view(p_visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_new_visitor boolean := false;
begin
  if p_visitor_key is null or length(trim(p_visitor_key)) < 8 or length(trim(p_visitor_key)) > 128 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_visitor');
  end if;

  insert into web_app_daily_stats as s (view_date, page_views, unique_visitors)
  values (v_day, 0, 0)
  on conflict (view_date) do nothing;

  insert into web_app_daily_visitors (view_date, visitor_key)
  values (v_day, trim(p_visitor_key))
  on conflict (view_date, visitor_key) do nothing;

  if found then
    v_new_visitor := true;
  end if;

  update web_app_daily_stats
  set
    page_views = page_views + 1,
    unique_visitors = unique_visitors + case when v_new_visitor then 1 else 0 end,
    updated_at = now()
  where view_date = v_day;

  return jsonb_build_object(
    'ok', true,
    'view_date', v_day,
    'new_visitor', v_new_visitor
  );
end;
$$;

revoke all on function public.record_web_app_page_view(text) from public, anon, authenticated;
grant execute on function public.record_web_app_page_view(text) to service_role;
