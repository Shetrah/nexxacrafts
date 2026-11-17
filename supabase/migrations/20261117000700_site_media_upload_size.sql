-- The admin image drop zone accepts files up to 20 MiB; align the public bucket limit.
update storage.buckets
set file_size_limit = 20971520
where id = 'site-media';
