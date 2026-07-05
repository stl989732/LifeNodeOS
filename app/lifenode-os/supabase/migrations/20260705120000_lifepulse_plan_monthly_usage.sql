-- LifePulse plan generations per UTC calendar month (Core plan).

create table if not exists public.lifepulse_plan_monthly_usage (
  user_id text not null,
  usage_month date not null,
  plans_generated integer not null default 0 check (plans_generated >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_month)
);

comment on table public.lifepulse_plan_monthly_usage is
  'UTC-month LifePulse AI plan generation count per user (Core monthly cap).';

create or replace function public.check_and_meter_lifepulse_plan_monthly(
  p_user_id text,
  p_max_monthly integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', (now() at time zone 'utc'))::date;
  v_row lifepulse_plan_monthly_usage%rowtype;
  v_after integer;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_user');
  end if;

  if p_max_monthly is null or p_max_monthly >= 999 then
    return jsonb_build_object(
      'allowed', true,
      'plans_used', 0,
      'plans_limit', p_max_monthly
    );
  end if;

  insert into lifepulse_plan_monthly_usage as u (user_id, usage_month)
  values (p_user_id, v_month)
  on conflict (user_id, usage_month) do nothing;

  select * into v_row
  from lifepulse_plan_monthly_usage
  where user_id = p_user_id and usage_month = v_month
  for update;

  v_after := v_row.plans_generated + 1;

  if v_after > p_max_monthly then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit',
      'plans_used', v_row.plans_generated,
      'plans_limit', p_max_monthly
    );
  end if;

  update lifepulse_plan_monthly_usage set
    plans_generated = v_after,
    updated_at = now()
  where user_id = p_user_id and usage_month = v_month;

  return jsonb_build_object(
    'allowed', true,
    'plans_used', v_after,
    'plans_limit', p_max_monthly
  );
end;
$$;

comment on function public.check_and_meter_lifepulse_plan_monthly(text, integer) is
  'Atomically meters LifePulse plan generation against monthly plan cap (Core).';

revoke all on table public.lifepulse_plan_monthly_usage from public;
revoke all on function public.check_and_meter_lifepulse_plan_monthly(text, integer) from public;

grant select, insert, update on table public.lifepulse_plan_monthly_usage to service_role;
grant execute on function public.check_and_meter_lifepulse_plan_monthly(text, integer) to service_role;
