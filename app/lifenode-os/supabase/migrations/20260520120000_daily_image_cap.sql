-- Daily Gemini image-generation cap (Kitchen AI: recipe, chef_execute).
-- Called from Next.js via service_role: check_and_increment_image_cap(user_id, max_cap).

create table if not exists public.daily_image_generation_caps (
  user_id text not null,
  usage_date date not null default ((now() at time zone 'utc')::date),
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

comment on table public.daily_image_generation_caps is
  'Per-user UTC-day counter for Kitchen AI image generation (Gemini IMAGE modality).';

create or replace function public.check_and_increment_image_cap(
  user_id text,
  max_cap integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_count integer;
begin
  if user_id is null or length(trim(user_id)) = 0 then
    return false;
  end if;

  if max_cap is null or max_cap < 1 then
    return false;
  end if;

  insert into public.daily_image_generation_caps as caps (user_id, usage_date, count)
  values (check_and_increment_image_cap.user_id, v_today, 1)
  on conflict (user_id, usage_date)
  do update
    set
      count = caps.count + 1,
      updated_at = now()
  where caps.count < max_cap
  returning caps.count into v_count;

  return v_count is not null;
end;
$$;

comment on function public.check_and_increment_image_cap(text, integer) is
  'Atomically increments today''s image count if under max_cap; returns false when at or over limit.';

revoke all on table public.daily_image_generation_caps from public;
revoke all on function public.check_and_increment_image_cap(text, integer) from public;

grant select, insert, update on table public.daily_image_generation_caps to service_role;
grant execute on function public.check_and_increment_image_cap(text, integer) to service_role;

alter table public.daily_image_generation_caps enable row level security;
