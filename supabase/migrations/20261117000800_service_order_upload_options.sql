-- Artwork uploads are optional and configured per service by administrators.
alter table public.services
  add column if not exists allow_file_uploads boolean not null default false;
