-- Allow longer EOD screen recordings (up to ~15 min) to upload for client share links.
-- Additive only: raises the private bucket size cap; no user rows are modified.

update storage.buckets
set file_size_limit = 262144000
where id = 'user-screen-captures';
