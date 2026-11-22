-- Private storage for invoice/receipt PDFs shared by Resend and WhatsApp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-documents', 'payment-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "Staff read payment documents" on storage.objects;
create policy "Staff read payment documents" on storage.objects
for select to authenticated using (
  bucket_id = 'payment-documents'
  and public.has_any_role(array['admin','finance']::public.app_role[])
);

alter table public.payment_email_outbox
  add column if not exists customer_whatsapp_sent_at timestamptz,
  add column if not exists customer_whatsapp_error text,
  add column if not exists customer_email_error text,
  add column if not exists receipt_pdf_path text,
  add column if not exists customer_email_pdf_version integer not null default 1,
  add column if not exists customer_whatsapp_pdf_version integer not null default 1;

alter table public.payments
  add column if not exists receipt_whatsapp_sent_at timestamptz;

alter table public.invoices
  add column if not exists email_pdf_version integer not null default 1,
  add column if not exists whatsapp_pdf_version integer not null default 1;
