-- NextAuth + browser anon key cannot enforce per-user RLS (no auth.uid()).
-- Linos + inbox: server-only via service_role API routes.
-- Clears Supabase advisor warnings on permissive UPDATE/DELETE policies.

-- -----------------------------------------------------------------------------
-- linos_chats / linos_messages — service_role only (app uses /api/linos/*)
-- -----------------------------------------------------------------------------
drop policy if exists "linos_chats_select" on public.linos_chats;
drop policy if exists "linos_chats_insert" on public.linos_chats;
drop policy if exists "linos_chats_update" on public.linos_chats;
drop policy if exists "linos_chats_delete" on public.linos_chats;
drop policy if exists "linos_chats_select_anon" on public.linos_chats;
drop policy if exists "linos_chats_insert_anon" on public.linos_chats;

drop policy if exists "linos_messages_select" on public.linos_messages;
drop policy if exists "linos_messages_insert" on public.linos_messages;
drop policy if exists "linos_messages_update" on public.linos_messages;
drop policy if exists "linos_messages_delete" on public.linos_messages;
drop policy if exists "linos_messages_select_anon" on public.linos_messages;
drop policy if exists "linos_messages_insert_anon" on public.linos_messages;

revoke all on table public.linos_chats from anon, authenticated;
revoke all on table public.linos_messages from anon, authenticated;

grant select, insert, update, delete on table public.linos_chats to service_role;
grant select, insert, update, delete on table public.linos_messages to service_role;

-- -----------------------------------------------------------------------------
-- inbox_items — server-only (app uses /api/inbox/* + inboxDb.ts)
-- -----------------------------------------------------------------------------
drop policy if exists "inbox_items_select" on public.inbox_items;
drop policy if exists "inbox_items_insert" on public.inbox_items;
drop policy if exists "inbox_items_update" on public.inbox_items;
drop policy if exists "inbox_items_delete" on public.inbox_items;

revoke all on table public.inbox_items from anon, authenticated;

grant select, insert, update, delete on table public.inbox_items to service_role;

-- -----------------------------------------------------------------------------
-- linos-attachments storage — uploads via /api/linos/chats/[id]/attachments
-- -----------------------------------------------------------------------------
drop policy if exists "linos_attachments_objects_read" on storage.objects;
drop policy if exists "linos_attachments_objects_insert" on storage.objects;

update storage.buckets
set public = false
where id = 'linos-attachments';
