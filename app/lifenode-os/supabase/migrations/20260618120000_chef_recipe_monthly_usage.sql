-- ChefNode recipe generations per UTC calendar month (recipe + chef_execute modes).

create table if not exists public.chef_recipe_monthly_usage (
  user_id text not null,
  usage_month date not null,
  recipes_generated integer not null default 0 check (recipes_generated >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_month)
);

comment on table public.chef_recipe_monthly_usage is
  'UTC-month ChefNode full recipe generation count per user.';

create or replace function public.check_and_meter_chef_recipe(
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
  v_row chef_recipe_monthly_usage%rowtype;
  v_after integer;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_user');
  end if;

  if p_max_monthly is null or p_max_monthly >= 999 then
    return jsonb_build_object(
      'allowed', true,
      'recipes_used', 0,
      'recipes_limit', p_max_monthly
    );
  end if;

  insert into chef_recipe_monthly_usage as u (user_id, usage_month)
  values (p_user_id, v_month)
  on conflict (user_id, usage_month) do nothing;

  select * into v_row
  from chef_recipe_monthly_usage
  where user_id = p_user_id and usage_month = v_month
  for update;

  v_after := v_row.recipes_generated + 1;

  if v_after > p_max_monthly then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit',
      'recipes_used', v_row.recipes_generated,
      'recipes_limit', p_max_monthly
    );
  end if;

  update chef_recipe_monthly_usage set
    recipes_generated = v_after,
    updated_at = now()
  where user_id = p_user_id and usage_month = v_month;

  return jsonb_build_object(
    'allowed', true,
    'recipes_used', v_after,
    'recipes_limit', p_max_monthly
  );
end;
$$;

comment on function public.check_and_meter_chef_recipe(text, integer) is
  'Atomically meters ChefNode recipe generation against monthly plan cap.';

revoke all on table public.chef_recipe_monthly_usage from public;
revoke all on function public.check_and_meter_chef_recipe(text, integer) from public;

grant select, insert, update on table public.chef_recipe_monthly_usage to service_role;
grant execute on function public.check_and_meter_chef_recipe(text, integer) to service_role;

alter table public.chef_recipe_monthly_usage enable row level security;
