-- Track invoice email delivery. A null timestamp means it has not been sent successfully.
alter table public.invoices add column if not exists sent_at timestamptz;
