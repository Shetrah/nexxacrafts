-- Keep an auditable per-channel history for every issued quotation delivery.
create table if not exists public.quote_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quote_requests(id) on delete cascade,
  request_id uuid not null,
  channel text not null check (channel in ('email', 'whatsapp')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (request_id, channel)
);

create index if not exists quote_delivery_logs_quote_created_idx
  on public.quote_delivery_logs (quote_id, created_at desc);

alter table public.quote_delivery_logs enable row level security;
revoke all on public.quote_delivery_logs from public, anon, authenticated;
grant select on public.quote_delivery_logs to authenticated;
grant all on public.quote_delivery_logs to service_role;

drop policy if exists quote_delivery_logs_staff_read on public.quote_delivery_logs;
create policy quote_delivery_logs_staff_read on public.quote_delivery_logs
  for select to authenticated
  using (public.has_any_role(array['admin', 'sales', 'finance']::public.app_role[]));

comment on table public.quote_delivery_logs is
  'Append-only delivery audit records for issued quotation PDFs sent by email or WhatsApp.';
