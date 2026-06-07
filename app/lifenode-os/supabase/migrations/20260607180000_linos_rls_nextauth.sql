-- NextAuth user_id (text) + browser anon key — NOT auth.uid().
-- Production drift used authenticated-only policies that block Linos chat inserts.

alter table public.linos_chats enable row level security;
alter table public.linos_messages enable row level security;

-- linos_chats
drop policy if exists "linos_chats_select_anon" on public.linos_chats;
drop policy if exists "linos_chats_insert_anon" on public.linos_chats;
drop policy if exists "linos_chats_insert_own_authenticated" on public.linos_chats;
drop policy if exists "linos_chats_update_own_authenticated" on public.linos_chats;
drop policy if exists "linos_chats_delete_own_authenticated" on public.linos_chats;

create policy "linos_chats_select"
  on public.linos_chats for select
  to anon, authenticated
  using (true);

create policy "linos_chats_insert"
  on public.linos_chats for insert
  to anon, authenticated
  with check (user_id is not null and length(trim(user_id)) > 0);

create policy "linos_chats_update"
  on public.linos_chats for update
  to anon, authenticated
  using (true)
  with check (user_id is not null and length(trim(user_id)) > 0);

create policy "linos_chats_delete"
  on public.linos_chats for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.linos_chats to anon, authenticated;

-- linos_messages
drop policy if exists "linos_messages_select_anon" on public.linos_messages;
drop policy if exists "linos_messages_insert_anon" on public.linos_messages;
drop policy if exists "linos_messages_insert_own_authenticated" on public.linos_messages;
drop policy if exists "linos_messages_update_own_authenticated" on public.linos_messages;
drop policy if exists "linos_messages_delete_own_authenticated" on public.linos_messages;

create policy "linos_messages_select"
  on public.linos_messages for select
  to anon, authenticated
  using (true);

create policy "linos_messages_insert"
  on public.linos_messages for insert
  to anon, authenticated
  with check (
    chat_id is not null
    and exists (
      select 1
      from public.linos_chats c
      where c.id = linos_messages.chat_id
    )
  );

create policy "linos_messages_update"
  on public.linos_messages for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "linos_messages_delete"
  on public.linos_messages for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.linos_messages to anon, authenticated;
