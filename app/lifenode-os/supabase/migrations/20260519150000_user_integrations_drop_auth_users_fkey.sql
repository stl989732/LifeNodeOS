-- NextAuth stores user_id as text (credential UUID or OAuth subject).
-- Drop FK to auth.users when present so inserts match lifenode_trackers / linos_chats.
alter table public.user_integrations
  drop constraint if exists user_integrations_user_id_fkey;
