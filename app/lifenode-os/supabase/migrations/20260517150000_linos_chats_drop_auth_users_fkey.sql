-- LifeNode OS auth is NextAuth (JWT). Those user IDs do not appear in Supabase auth.users,
-- so an FK linos_chats_user_id_fkey → auth.users will always reject inserts.

alter table public.linos_chats
  drop constraint if exists linos_chats_user_id_fkey;

-- Store NextAuth IDs (UUID for credentials users; alphanumeric for some OAuth subjects) reliably.