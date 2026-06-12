-- Unified daily AI usage counters (UTC day). Used by check_and_meter_ai RPC.

create table if not exists public.ai_daily_usage (
  user_id text not null,
  usage_date date not null default ((now() at time zone 'utc')::date),
  credits_used integer not null default 0 check (credits_used >= 0),
  linos_assistant integer not null default 0,
  vanode_ai integer not null default 0,
  biznode_ai integer not null default 0,
  lifepulse_plan integer not null default 0,
  lifepulse_intake integer not null default 0,
  chef_text integer not null default 0,
  chef_image integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

comment on table public.ai_daily_usage is
  'UTC-day AI usage counters and credit sum per user.';

create or replace function public.check_and_meter_ai(
  p_user_id text,
  p_plan text,
  p_event text,
  p_credits integer,
  p_feature_key text,
  p_credit_limit integer,
  p_feature_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_row ai_daily_usage%rowtype;
  v_credits_after integer;
  v_feature_after integer;
  v_feature_current integer;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_user');
  end if;

  if p_feature_limit is not null and p_feature_limit < 1 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'feature_exhausted',
      'feature', p_feature_key,
      'feature_used', 0,
      'feature_limit', p_feature_limit
    );
  end if;

  insert into ai_daily_usage as u (user_id, usage_date)
  values (p_user_id, v_today)
  on conflict (user_id, usage_date) do nothing;

  select * into v_row
  from ai_daily_usage
  where user_id = p_user_id and usage_date = v_today
  for update;

  v_feature_current := case p_feature_key
    when 'linos_assistant' then v_row.linos_assistant
    when 'vanode_ai' then v_row.vanode_ai
    when 'biznode_ai' then v_row.biznode_ai
    when 'lifepulse_plan' then v_row.lifepulse_plan
    when 'lifepulse_intake' then v_row.lifepulse_intake
    when 'chef_text' then v_row.chef_text
    when 'chef_image' then v_row.chef_image
    else v_row.linos_assistant
  end;

  v_credits_after := v_row.credits_used + coalesce(p_credits, 1);
  v_feature_after := v_feature_current + 1;

  if v_credits_after > p_credit_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'credits_exhausted',
      'credits_used', v_row.credits_used,
      'credits_limit', p_credit_limit
    );
  end if;

  if v_feature_after > p_feature_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'feature_exhausted',
      'feature', p_feature_key,
      'feature_used', v_feature_current,
      'feature_limit', p_feature_limit,
      'credits_used', v_row.credits_used,
      'credits_limit', p_credit_limit
    );
  end if;

  update ai_daily_usage set
    credits_used = v_credits_after,
    linos_assistant = case when p_feature_key = 'linos_assistant' then v_feature_after else linos_assistant end,
    vanode_ai = case when p_feature_key = 'vanode_ai' then v_feature_after else vanode_ai end,
    biznode_ai = case when p_feature_key = 'biznode_ai' then v_feature_after else biznode_ai end,
    lifepulse_plan = case when p_feature_key = 'lifepulse_plan' then v_feature_after else lifepulse_plan end,
    lifepulse_intake = case when p_feature_key = 'lifepulse_intake' then v_feature_after else lifepulse_intake end,
    chef_text = case when p_feature_key = 'chef_text' then v_feature_after else chef_text end,
    chef_image = case when p_feature_key = 'chef_image' then v_feature_after else chef_image end,
    updated_at = now()
  where user_id = p_user_id and usage_date = v_today;

  return jsonb_build_object(
    'allowed', true,
    'credits_used', v_credits_after,
    'credits_limit', p_credit_limit,
    'feature', p_feature_key,
    'feature_used', v_feature_after,
    'feature_limit', p_feature_limit
  );
end;
$$;

comment on function public.check_and_meter_ai(text, text, text, integer, text, integer, integer) is
  'Atomically meters AI usage against daily credit pool and per-feature caps.';

revoke all on table public.ai_daily_usage from public;
revoke all on function public.check_and_meter_ai(text, text, text, integer, text, integer, integer) from public;

grant select, insert, update on table public.ai_daily_usage to service_role;
grant execute on function public.check_and_meter_ai(text, text, text, integer, text, integer, integer) to service_role;

alter table public.ai_daily_usage enable row level security;
