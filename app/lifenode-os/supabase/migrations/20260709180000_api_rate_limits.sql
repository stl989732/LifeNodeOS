-- Sliding-window rate limit buckets for API abuse protection (IP + user keys).
-- Called from Next.js via service_role: check_and_increment_rate_limit(bucket, limit, window_seconds).

create table if not exists public.api_rate_limit_buckets (
  bucket_key text not null,
  window_start bigint not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_start)
);

comment on table public.api_rate_limit_buckets is
  'Fixed-window request counters for API rate limiting (bucket_key + window_start epoch).';

create index if not exists api_rate_limit_buckets_updated_idx
  on public.api_rate_limit_buckets (updated_at);

create or replace function public.check_and_increment_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now_epoch bigint := floor(extract(epoch from now()))::bigint;
  v_window_seconds integer := greatest(p_window_seconds, 1);
  v_window_start bigint := (v_now_epoch / v_window_seconds) * v_window_seconds;
  v_count integer;
  v_reset_epoch bigint;
  v_key text;
begin
  v_key := trim(p_bucket_key);
  if v_key is null or length(v_key) = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_key');
  end if;

  if p_limit is null or p_limit < 1 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_limit');
  end if;

  insert into public.api_rate_limit_buckets as b (bucket_key, window_start, hit_count)
  values (v_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update
    set
      hit_count = b.hit_count + 1,
      updated_at = now()
    where b.hit_count < p_limit
  returning b.hit_count into v_count;

  v_reset_epoch := v_window_start + v_window_seconds;

  if v_count is null then
    select b.hit_count
      into v_count
    from public.api_rate_limit_buckets b
    where b.bucket_key = v_key
      and b.window_start = v_window_start;

    return jsonb_build_object(
      'allowed', false,
      'count', coalesce(v_count, p_limit),
      'limit', p_limit,
      'reset_at', to_timestamp(v_reset_epoch)
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'count', v_count,
    'limit', p_limit,
    'reset_at', to_timestamp(v_reset_epoch)
  );
end;
$$;

comment on function public.check_and_increment_rate_limit(text, integer, integer) is
  'Atomically increments a fixed-window counter; returns allowed=false when at or over limit.';

revoke all on table public.api_rate_limit_buckets from public;
revoke all on function public.check_and_increment_rate_limit(text, integer, integer) from public;

grant select, insert, update, delete on table public.api_rate_limit_buckets to service_role;
grant execute on function public.check_and_increment_rate_limit(text, integer, integer) to service_role;

alter table public.api_rate_limit_buckets enable row level security;
