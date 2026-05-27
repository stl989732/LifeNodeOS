-- Parent rows for `linos_messages.chat_id` (foreign key target).
-- `user_id` is `text` so it can store NextAuth credential UUIDs without requiring `auth.users`.
-- If your project uses Supabase Auth only, change this column to `uuid references auth.users(id)` via a dedicated migration.

create table if not exists public.linos_chats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  node_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists linos_chats_user_created_idx on public.linos_chats (user_id, created_at desc);

alter table public.linos_chats enable row level security;

drop policy if exists "linos_chats_select_anon" on public.linos_chats;
drop policy if exists "linos_chats_insert_anon" on public.linos_chats;

create policy "linos_chats_select_anon"
  on public.linos_chats for select
  to anon, authenticated
  using (true);

create policy "linos_chats_insert_anon"
  on public.linos_chats for insert
  to anon, authenticated
  with check (true);

grant select, insert on table public.linos_chats to anon, authenticated;
