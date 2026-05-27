-- Linos Assistant persisted thread + attachments bucket.

create table if not exists public.linos_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists linos_messages_chat_created_idx on public.linos_messages (chat_id, created_at);

comment on table public.linos_messages is 'Linos Assistant chat rows; partitioned logically by chat_id (client-held UUID until auth mapping exists).';

alter table public.linos_messages enable row level security;

-- Dev-friendly anon access — replace with auth.uid()-scoped policies in production.

create policy "linos_messages_select_anon"
  on public.linos_messages for select
  to anon, authenticated
  using (true);

create policy "linos_messages_insert_anon"
  on public.linos_messages for insert
  to anon, authenticated
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'linos-attachments',
  'linos-attachments',
  true,
  52428800,
  ARRAY[
    'image/png'::text,
    'image/jpeg'::text,
    'image/webp'::text,
    'image/gif'::text,
    'application/pdf'::text,
    'text/plain'::text,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'::text
  ]
)
on conflict (id) do nothing;

drop policy if exists "linos_attachments_objects_read" on storage.objects;
drop policy if exists "linos_attachments_objects_insert" on storage.objects;

create policy "linos_attachments_objects_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'linos-attachments');

create policy "linos_attachments_objects_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'linos-attachments');
