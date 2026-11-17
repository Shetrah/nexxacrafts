-- Allow client order artwork and supporting files up to 100 MiB per file.
update storage.buckets
set file_size_limit = 104857600
where id = 'customer-files';
