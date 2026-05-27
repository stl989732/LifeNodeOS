-- Linos AI-generated tracker fields

alter table public.lifenode_trackers
  add column if not exists description text,
  add column if not exists planned_at timestamptz;

comment on column public.lifenode_trackers.description is
  'Empathetic Linos intro + markdown action plan';
comment on column public.lifenode_trackers.planned_at is
  'Exact minute the user planned this activity';
