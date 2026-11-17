-- Link gateway transactions to invoices and keep email/webhook processing idempotent.
alter table public.payments
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists failure_reason text;

create index if not exists idx_payments_invoice on public.payments(invoice_id, created_at desc);
create unique index if not exists idx_payments_payhero_external_reference
  on public.payments(provider, provider_reference)
  where provider = 'payhero' and provider_reference is not null;

create table if not exists public.payment_email_outbox (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_email text,
  customer_name text not null,
  invoice_number text not null,
  invoice_total numeric(14,2) not null,
  amount_paid numeric(14,2) not null,
  prior_amount_paid numeric(14,2) not null default 0,
  payment_amount numeric(14,2) not null,
  transaction_reference text,
  provider_reference text,
  payment_method text not null,
  customer_email_sent_at timestamptz,
  admin_email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.payment_email_outbox enable row level security;
revoke all on public.payment_email_outbox from public, anon, authenticated;

create table if not exists public.payment_admin_notifications (
  payment_id uuid primary key references public.payments(id) on delete cascade,
  dashboard_notified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.payment_admin_notifications enable row level security;
revoke all on public.payment_admin_notifications from public, anon, authenticated;

create or replace function public.prevent_duplicate_payhero_invoice_prompt()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.id is null then new.id := gen_random_uuid(); end if;
  if new.provider='payhero' and new.invoice_id is not null and new.status in ('pending','initiated')
    and exists(select 1 from public.payments p where p.id<>new.id and p.invoice_id=new.invoice_id
      and p.provider='payhero' and p.status in ('pending','initiated')) then
    raise exception 'An M-Pesa request is already awaiting a result for this invoice.';
  end if;
  return new;
end;
$$;
drop trigger if exists payments_prevent_duplicate_payhero_prompt on public.payments;
create trigger payments_prevent_duplicate_payhero_prompt before insert or update of provider,invoice_id,status
  on public.payments for each row execute function public.prevent_duplicate_payhero_invoice_prompt();

alter table public.invoices add column if not exists sent_at timestamptz;

create unique index if not exists idx_invoices_order_unique
  on public.invoices(order_id) where order_id is not null;

drop policy if exists invoices_customer_or_staff_select on public.invoices;
create policy invoices_customer_or_staff_select on public.invoices for select to authenticated using (
  (order_id is not null and exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()))
  or public.has_any_role(array['admin','finance','sales']::public.app_role[])
);

-- The customer can see their own payment status while admins retain the finance ledger view.
drop policy if exists payments_select_owner_or_staff on public.payments;
create policy payments_select_owner_or_staff on public.payments for select to authenticated using (
  exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid())
  or public.has_any_role(array['super_admin','admin','finance']::public.app_role[])
);

-- A service-role-only atomic claim for PayHero callback processing. Repeated callbacks
-- cannot confirm or issue email for the same payment more than once.
create or replace function public.confirm_payhero_payment(
  p_external_reference text,
  p_provider_reference text,
  p_transaction_reference text,
  p_paid_amount numeric,
  p_phone text
) returns table(payment_id uuid, invoice_id uuid, order_id uuid, customer_id uuid,
  customer_name text, customer_email text, invoice_number text, invoice_total numeric,
  amount_paid numeric, payment_amount numeric, payment_method text)
language plpgsql security definer set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_order public.orders%rowtype;
begin
  select * into v_payment from public.payments
    where provider = 'payhero' and provider_reference = p_external_reference
    for update;
  if not found or v_payment.invoice_id is null then return; end if;
  if v_payment.status = 'confirmed' then return; end if;
  if v_payment.status not in ('pending','initiated') then return; end if;
  if round(v_payment.amount, 0) <> round(p_paid_amount, 0) then
    update public.payments set failure_reason = 'Callback amount did not match payment request.' where id = v_payment.id;
    return;
  end if;
  if nullif(v_payment.transaction_reference,'') is not null then return; end if;

  select * into v_invoice from public.invoices where id = v_payment.invoice_id for update;
  if not found or v_invoice.status in ('draft','void') then return; end if;
  select * into v_order from public.orders where id = v_payment.order_id;
  if not found then return; end if;

  update public.payments set status='confirmed', transaction_reference=p_transaction_reference,
    confirmed_at=now(), failure_reason=null where id=v_payment.id;
  update public.invoices set amount_paid=least(total, amount_paid + p_paid_amount),
    status=case when amount_paid + p_paid_amount >= total then 'paid' else 'partially_paid' end
    where id=v_invoice.id returning * into v_invoice;
  update public.orders set payment_status=case when v_invoice.amount_paid >= v_invoice.total then 'paid' else 'partially_paid' end,
    updated_at=now() where id=v_order.id;

  insert into public.payment_email_outbox(payment_id,invoice_id,customer_email,customer_name,invoice_number,
    invoice_total,amount_paid,prior_amount_paid,payment_amount,transaction_reference,provider_reference,payment_method)
  values(v_payment.id,v_invoice.id,v_invoice.customer_email,v_invoice.customer_name,v_invoice.invoice_number,
    v_invoice.total,v_invoice.amount_paid-v_payment.amount,v_invoice.amount_paid,v_payment.amount,p_transaction_reference,p_provider_reference,v_payment.method)
  on conflict(payment_id) do nothing;
  insert into public.payment_admin_notifications(payment_id) values(v_payment.id) on conflict(payment_id) do nothing;

  return query select v_payment.id, v_invoice.id, v_order.id, v_order.customer_id,
    v_invoice.customer_name, v_invoice.customer_email, v_invoice.invoice_number,
    v_invoice.total, v_invoice.amount_paid, v_payment.amount, v_payment.method;
end;
$$;
revoke all on function public.confirm_payhero_payment(text,text,text,numeric,text) from public, anon, authenticated;
grant execute on function public.confirm_payhero_payment(text,text,text,numeric,text) to service_role;
