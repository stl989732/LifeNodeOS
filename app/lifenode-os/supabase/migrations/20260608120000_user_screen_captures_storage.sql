-- Private bucket for cross-device VANode screen recordings (server uploads via service role).

insert into storage.buckets (id, name, public, file_size_limit)
values ('user-screen-captures', 'user-screen-captures', false, 104857600)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit;
