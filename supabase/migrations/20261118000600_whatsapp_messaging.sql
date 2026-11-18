create table if not exists public.whatsapp_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('new_order_admin','artwork_proof')),
  recipient text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_delivery_logs enable row level security;
revoke all on public.whatsapp_delivery_logs from public, anon, authenticated;
grant all on public.whatsapp_delivery_logs to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('order-artwork', 'order-artwork', false, 104857600, array['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 104857600,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf'];

drop policy if exists "Admins upload order artwork" on storage.objects;
create policy "Admins upload order artwork" on storage.objects
for insert to authenticated with check (
  bucket_id = 'order-artwork' and public.has_any_role(array['admin','finance']::public.app_role[])
);

drop policy if exists "Admins read order artwork" on storage.objects;
create policy "Admins read order artwork" on storage.objects
for select to authenticated using (
  bucket_id = 'order-artwork' and public.has_any_role(array['admin','finance']::public.app_role[])
);
