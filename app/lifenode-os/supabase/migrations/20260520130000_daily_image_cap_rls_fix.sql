-- Cap table is only touched by check_and_increment_image_cap (SECURITY DEFINER).
-- RLS with no policies blocked inserts for some roles; disable RLS on this internal counter table.
alter table public.daily_image_generation_caps disable row level security;
