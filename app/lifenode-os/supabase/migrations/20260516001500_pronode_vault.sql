-- ProNode Smart Vault + time-limited share links (adjust RLS for your auth model).

create table if not exists public.pronode_vault (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  node_type text not null default 'General',
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.pronode_vault_shares (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.pronode_vault (id) on delete cascade,
  token text not null unique,
  snapshot jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pronode_vault_shares_token_idx on public.pronode_vault_shares (token);
create index if not exists pronode_vault_shares_expires_idx on public.pronode_vault_shares (expires_at);

comment on table public.pronode_vault is 'ProNode rich-text vault documents (TipTap JSON in content).';
comment on table public.pronode_vault_shares is 'Temporary read-only snapshots for public share URLs.';

alter table public.pronode_vault enable row level security;
alter table public.pronode_vault_shares enable row level security;

-- Example policies: authenticated users own rows (replace with profiles.id / auth.uid() mapping as needed).
-- DROP policies before re-run in production migrations.

create policy "pronode_vault_select_authenticated"
  on public.pronode_vault for select
  to authenticated
  using (true);

create policy "pronode_vault_write_authenticated"
  on public.pronode_vault for all
  to authenticated
  using (true)
  with check (true);

create policy "pronode_vault_shares_select_valid_anon"
  on public.pronode_vault_shares for select
  to anon
  using (expires_at > now());

create policy "pronode_vault_shares_insert_authenticated"
  on public.pronode_vault_shares for insert
  to authenticated
  with check (true);
