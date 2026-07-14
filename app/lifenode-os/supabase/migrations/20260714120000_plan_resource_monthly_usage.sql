-- Per-user monthly caps for invoices, EOD reports, transcriptions, and kanban boards.

create table if not exists public.plan_resource_monthly_usage (
  user_id text not null,
  usage_month date not null,
  invoices integer not null default 0 check (invoices >= 0),
  eod_records integer not null default 0 check (eod_records >= 0),
  transcriptions integer not null default 0 check (transcriptions >= 0),
  kanban_boards integer not null default 0 check (kanban_boards >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_month)
);

comment on table public.plan_resource_monthly_usage is
  'UTC-month counts for plan-gated resources (invoices, EOD, transcriptions, kanban boards).';

create or replace function public.check_and_meter_plan_resource(
  p_user_id text,
  p_feature text,
  p_max_monthly integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_before integer := 0;
  v_after integer;
  v_col text;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_user');
  end if;

  if p_feature not in ('invoices', 'eod_records', 'transcriptions', 'kanban_boards') then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_feature');
  end if;

  v_col := p_feature;

  if p_max_monthly is null or p_max_monthly >= 999 then
    return jsonb_build_object(
      'allowed', true,
      'used', 0,
      'limit', p_max_monthly,
      'feature', p_feature
    );
  end if;

  insert into plan_resource_monthly_usage as u (user_id, usage_month)
  values (p_user_id, v_month)
  on conflict (user_id, usage_month) do nothing;

  execute format(
    'select %I from plan_resource_monthly_usage where user_id = $1 and usage_month = $2 for update',
    v_col
  ) into v_before using p_user_id, v_month;

  v_before := coalesce(v_before, 0);
  v_after := v_before + 1;

  if v_after > p_max_monthly then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit',
      'used', v_before,
      'limit', p_max_monthly,
      'feature', p_feature
    );
  end if;

  execute format(
    'update plan_resource_monthly_usage set %I = $1, updated_at = now() where user_id = $2 and usage_month = $3',
    v_col
  ) using v_after, p_user_id, v_month;

  return jsonb_build_object(
    'allowed', true,
    'used', v_after,
    'limit', p_max_monthly,
    'feature', p_feature
  );
end;
$$;

comment on function public.check_and_meter_plan_resource(text, text, integer) is
  'Atomically meters a plan resource against a UTC monthly cap.';

revoke all on table public.plan_resource_monthly_usage from public;
revoke all on function public.check_and_meter_plan_resource(text, text, integer) from public;

grant select, insert, update on table public.plan_resource_monthly_usage to service_role;
grant execute on function public.check_and_meter_plan_resource(text, text, integer) to service_role;

alter table public.plan_resource_monthly_usage enable row level security;

drop policy if exists "plan_resource_monthly_usage_service_role_all"
  on public.plan_resource_monthly_usage;

create policy "plan_resource_monthly_usage_service_role_all"
  on public.plan_resource_monthly_usage
  for all
  to service_role
  using (true)
  with check (true);
