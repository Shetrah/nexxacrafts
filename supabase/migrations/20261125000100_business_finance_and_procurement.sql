-- Business operations foundation: auditable approvals, procurement and reconciled finance.
-- All money remains in KES unless a source row explicitly records another currency.

create table if not exists public.order_approval_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.quote_approval_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quote_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.quote_requests add column if not exists converted_order_id uuid references public.orders(id) on delete set null;
alter table public.quote_requests add column if not exists converted_at timestamptz;
-- Invoice currency is needed to reconcile only like-for-like payment ledger rows.
-- Existing invoices in this system are denominated in KES.
alter table public.invoices add column if not exists currency text not null default 'KES';
alter table public.invoices add column if not exists paid_at timestamptz;
create index if not exists order_approval_events_order_idx on public.order_approval_events(order_id, created_at desc);
create index if not exists quote_approval_events_quote_idx on public.quote_approval_events(quote_id, created_at desc);

create or replace function public.capture_business_status_change()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
begin
  if tg_table_name = 'orders' and new.status is distinct from old.status then
    insert into public.order_approval_events(order_id, from_status, to_status, actor_id)
    values(new.id, old.status, new.status, auth.uid());
  elsif tg_table_name = 'quote_requests' and new.status is distinct from old.status then
    insert into public.quote_approval_events(quote_id, from_status, to_status, actor_id)
    values(new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function public.capture_business_status_change() from public, anon, authenticated;
drop trigger if exists audit_order_status_change on public.orders;
create trigger audit_order_status_change after update of status on public.orders
for each row execute function public.capture_business_status_change();
drop trigger if exists audit_quote_status_change on public.quote_requests;
create trigger audit_quote_status_change after update of status on public.quote_requests
for each row execute function public.capture_business_status_change();

-- Explicit state transitions and payment-state protection run at the database boundary.
create or replace function public.guard_order_business_updates()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_role public.app_role;
begin
  if new.payment_status is distinct from old.payment_status
     and coalesce(auth.role(),'') <> 'service_role'
     and not public.has_any_role(array['super_admin','admin','finance']::public.app_role[])
     and coalesce(current_setting('app.payment_update_context',true),'') <> 'trusted_payment_rpc' then
    raise exception 'Only finance/admin or the trusted payment callback can change payment status';
  end if;
  if new.status is distinct from old.status and coalesce(auth.role(),'') <> 'service_role'
     and coalesce(current_setting('app.payment_update_context',true),'') <> 'trusted_payment_rpc' then
    select p.role into v_role from public.profiles p where p.id=auth.uid();
    if v_role in ('super_admin','admin') then return new; end if;
    if v_role is null then raise exception 'A verified staff role is required for order status changes'; end if;
    if v_role in ('sales','finance') and not (
      (old.status in ('submitted','awaiting_review') and new.status in ('awaiting_review','awaiting_payment','artwork_pending','awaiting_approval','cancelled')) or
      (old.status='awaiting_payment' and new.status in ('awaiting_review','artwork_pending','awaiting_approval','cancelled')) or
      (old.status='artwork_pending' and new.status in ('awaiting_approval','awaiting_review','cancelled'))
    ) then raise exception 'This role cannot make that order status transition'; end if;
    if v_role='production_manager' or v_role in ('designer','print_operator','laser_operator','developer') then
      if not ((old.status in ('artwork_pending','awaiting_approval') and new.status in ('artwork_pending','awaiting_approval','in_production','cancelled')) or
              (old.status='in_production' and new.status in ('in_production','quality_check','cancelled')) or
              (old.status='quality_check' and new.status in ('quality_check','in_production','ready_for_dispatch'))) then
        raise exception 'This role cannot make that order status transition';
      end if;
    elsif v_role='dispatch' then
      if not ((old.status='ready_for_dispatch' and new.status in ('ready_for_dispatch','dispatched')) or
              (old.status='dispatched' and new.status in ('dispatched','completed'))) then
        raise exception 'This role cannot make that order status transition';
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_order_business_updates() from public, anon, authenticated;
drop trigger if exists guard_order_business_updates on public.orders;
create trigger guard_order_business_updates before update of status,payment_status on public.orders
for each row execute function public.guard_order_business_updates();

create or replace function public.guard_quote_business_updates()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
begin
  if new.status='quoted' and coalesce(new.quoted_amount,0)<=0 then raise exception 'A positive quote amount is required before issuing a quote'; end if;
  if new.status='converted' and coalesce(current_setting('app.quote_conversion_context',true),'') <> 'quote_conversion_rpc' then
    raise exception 'Use the approved quote conversion workflow to create an order';
  end if;
  if new.status is distinct from old.status and coalesce(auth.role(),'') <> 'service_role' then
    if public.has_any_role(array['super_admin','admin']::public.app_role[]) then return new; end if;
    if not public.has_any_role(array['sales']::public.app_role[]) then raise exception 'Only sales/admin can move quote requests'; end if;
    if not (
      (old.status='submitted' and new.status in ('under_review','need_information','declined')) or
      (old.status='under_review' and new.status in ('need_information','quoted','declined')) or
      (old.status='need_information' and new.status in ('under_review','quoted','declined')) or
      (old.status='quoted' and new.status in ('accepted','declined','under_review')) or
      (old.status='accepted' and new.status='converted') or
      (old.status='declined' and new.status='under_review')
    ) then raise exception 'This quote status transition is not allowed'; end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_quote_business_updates() from public, anon, authenticated;
drop trigger if exists guard_quote_business_updates on public.quote_requests;
create trigger guard_quote_business_updates before update of status,quoted_amount on public.quote_requests
for each row execute function public.guard_quote_business_updates();

create or replace function public.guard_invoice_settlement()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_confirmed numeric(14,2);
begin
  if new.status='paid' and old.status is distinct from 'paid' then
    if coalesce(auth.role(),'') <> 'service_role'
       and not public.has_any_role(array['super_admin','admin','finance']::public.app_role[])
       and coalesce(current_setting('app.payment_update_context',true),'') <> 'trusted_payment_rpc' then
      raise exception 'Only finance/admin or the trusted payment callback can settle an invoice';
    end if;
    select coalesce(sum(p.amount),0) into v_confirmed from public.payments p
      where p.invoice_id=new.id and p.status in ('confirmed','reconciled') and p.currency=new.currency;
    if new.amount_paid < new.total or v_confirmed < new.total then
      raise exception 'Invoice cannot be marked paid until the confirmed payment ledger covers the full amount';
    end if;
    new.paid_at := coalesce(new.paid_at,now());
  end if;
  return new;
end $$;
revoke all on function public.guard_invoice_settlement() from public, anon, authenticated;
drop trigger if exists guard_invoice_settlement on public.invoices;
create trigger guard_invoice_settlement before update of status,amount_paid on public.invoices
for each row execute function public.guard_invoice_settlement();

create or replace function public.guard_invoice_paid_amount_write()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
begin
  if new.amount_paid is distinct from old.amount_paid
     and coalesce(current_setting('app.payment_update_context',true),'') <> 'trusted_payment_rpc' then
    raise exception 'Invoice paid totals are derived from confirmed payment ledger entries';
  end if;
  return new;
end $$;
revoke all on function public.guard_invoice_paid_amount_write() from public, anon, authenticated;
drop trigger if exists guard_invoice_paid_amount_write on public.invoices;
create trigger guard_invoice_paid_amount_write before update of amount_paid on public.invoices
for each row execute function public.guard_invoice_paid_amount_write();

-- Keep the invoice status consistent with its actual confirmed-payment ledger.
create or replace function public.sync_invoice_payment_ledger()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_invoice public.invoices%rowtype; v_paid numeric(14,2); v_settled numeric(14,2);
begin
  -- Reconcile both confirmations and reversals. Otherwise a refunded/cancelled
  -- confirmed payment would leave the invoice and order incorrectly marked paid.
  if new.status not in ('confirmed','reconciled')
     and (tg_op <> 'UPDATE' or old.status not in ('confirmed','reconciled')) then return new; end if;
  if new.invoice_id is null then return new; end if;
  select * into v_invoice from public.invoices where id=new.invoice_id for update;
  if not found then return new; end if;
  if v_invoice.status in ('draft','void') then
    if new.status in ('confirmed','reconciled') then raise exception 'Payment references an inactive invoice'; end if;
    return new;
  end if;
  select coalesce(sum(p.amount),0) into v_paid from public.payments p
    where p.invoice_id=new.invoice_id and p.status in ('confirmed','reconciled') and p.currency=v_invoice.currency;
  -- Keep the full overpayment in cash received, while capping the invoice balance
  -- at zero so a duplicate/extra transfer never disappears from the ledger.
  v_settled := least(v_paid,v_invoice.total);
  perform set_config('app.payment_update_context','trusted_payment_rpc',true);
  update public.invoices set amount_paid=v_settled,
    status=case when v_settled >= total then 'paid' when v_settled > 0 then 'partially_paid' else 'issued' end,
    paid_at=case when v_settled >= total then coalesce(paid_at,now()) else null end
  where id=new.invoice_id;
  update public.orders set payment_status=case when v_settled>=v_invoice.total then 'paid' when v_settled>0 then 'partially_paid' else 'unpaid' end,
    status=case when v_settled>=v_invoice.total and status='awaiting_payment' then 'awaiting_review' else status end,
    updated_at=now() where id=new.order_id;
  perform set_config('app.payment_update_context','',true);
  return new;
exception when others then
  perform set_config('app.payment_update_context','',true);
  raise;
end $$;
revoke all on function public.sync_invoice_payment_ledger() from public, anon, authenticated;
drop trigger if exists sync_invoice_payment_ledger on public.payments;
create trigger sync_invoice_payment_ledger after insert or update of status on public.payments
for each row execute function public.sync_invoice_payment_ledger();

-- Reconcile older rows once during migration so historical UI state agrees with
-- the confirmed payment ledger before the finance dashboard starts reading it.
do $$ begin
  perform set_config('app.payment_update_context','trusted_payment_rpc',true);
  with ledger as (
    select i.id, i.total, i.currency,
      coalesce(sum(p.amount) filter (where p.status in ('confirmed','reconciled') and p.currency=i.currency),0) as paid,
      max(p.confirmed_at) filter (where p.status in ('confirmed','reconciled') and p.currency=i.currency) as last_payment_at
    from public.invoices i left join public.payments p on p.invoice_id=i.id
    where i.status not in ('draft','void') group by i.id
  )
  update public.invoices i set
    amount_paid=least(greatest(i.total,0),ledger.paid),
    status=case when ledger.paid>=i.total then 'paid' when ledger.paid>0 then 'partially_paid' else 'issued' end,
    paid_at=case when ledger.paid>=i.total then coalesce(ledger.last_payment_at,i.paid_at,i.created_at) else null end
  from ledger where ledger.id=i.id;

  with order_totals as (
    select i.order_id,sum(i.amount_paid) paid,sum(i.total) total
    from public.invoices i where i.order_id is not null and i.status not in ('draft','void') group by i.order_id
  )
  update public.orders o set
    payment_status=case when t.paid>=t.total then 'paid' when t.paid>0 then 'partially_paid' else 'unpaid' end,
    status=case when t.paid>=t.total and o.status='awaiting_payment' then 'awaiting_review' else o.status end,
    updated_at=now()
  from order_totals t where t.order_id=o.id;
  perform set_config('app.payment_update_context','',true);
end $$;


-- PayHero confirmation used to increment invoice.amount_paid after changing the
-- payment row. The ledger trigger above now owns settlement, so read its result
-- instead of applying the same payment a second time.
create or replace function public.confirm_payhero_payment(
  p_external_reference text,
  p_provider_reference text,
  p_transaction_reference text,
  p_paid_amount numeric,
  p_phone text
) returns table(payment_id uuid, invoice_id uuid, order_id uuid, customer_id uuid,
  customer_name text, customer_email text, invoice_number text, invoice_total numeric,
  amount_paid numeric, payment_amount numeric, payment_method text)
language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_payment public.payments%rowtype; v_invoice public.invoices%rowtype; v_order public.orders%rowtype;
begin
  if nullif(trim(coalesce(p_transaction_reference,'')),'') is null or p_paid_amount is null or p_paid_amount<=0 then return; end if;
  select * into v_payment from public.payments where provider='payhero' and provider_reference=p_external_reference for update;
  if not found or v_payment.invoice_id is null or v_payment.status not in ('pending','initiated') then return; end if;
  if round(v_payment.amount,0) <> round(p_paid_amount,0) then
    update public.payments set failure_reason='Callback amount did not match payment request.' where id=v_payment.id;
    return;
  end if;
  if nullif(v_payment.transaction_reference,'') is not null then return; end if;
  select * into v_invoice from public.invoices where id=v_payment.invoice_id for update;
  if not found or v_invoice.status in ('draft','void') then return; end if;
  select * into v_order from public.orders where id=v_payment.order_id;
  if not found then return; end if;

  update public.payments set status='confirmed',transaction_reference=trim(p_transaction_reference),
    confirmed_at=now(),failure_reason=null where id=v_payment.id;
  -- The AFTER trigger reconciles the full confirmed ledger atomically.
  select * into v_invoice from public.invoices where id=v_payment.invoice_id;
  insert into public.payment_email_outbox(payment_id,invoice_id,customer_email,customer_name,invoice_number,
      invoice_total,amount_paid,prior_amount_paid,payment_amount,transaction_reference,provider_reference,payment_method)
  values(v_payment.id,v_invoice.id,v_invoice.customer_email,v_invoice.customer_name,v_invoice.invoice_number,
      v_invoice.total,v_invoice.amount_paid,greatest(0,v_invoice.amount_paid-v_payment.amount),v_payment.amount,
      trim(p_transaction_reference),p_provider_reference,v_payment.method)
  on conflict(payment_id) do nothing;
  insert into public.payment_admin_notifications(payment_id) values(v_payment.id) on conflict(payment_id) do nothing;
  return query select v_payment.id,v_invoice.id,v_order.id,v_order.customer_id,
    v_invoice.customer_name,v_invoice.customer_email,v_invoice.invoice_number,
    v_invoice.total,v_invoice.amount_paid,v_payment.amount,v_payment.method;
end;
$$;
revoke all on function public.confirm_payhero_payment(text,text,text,numeric,text) from public, anon, authenticated;
grant execute on function public.confirm_payhero_payment(text,text,text,numeric,text) to service_role;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='orders_money_nonnegative') then
    alter table public.orders add constraint orders_money_nonnegative check (coalesce(subtotal,0)>=0 and discount>=0 and tax>=0 and coalesce(total,0)>=0) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='invoices_money_bounds') then
    alter table public.invoices add constraint invoices_money_bounds check (subtotal>=0 and tax>=0 and total>=0 and amount_paid>=0 and amount_paid<=total) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='payments_positive_amount') then
    alter table public.payments add constraint payments_positive_amount check (amount is null or amount>0) not valid;
  end if;
end $$;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  tax_pin text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','partially_received','received','cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approval_note text,
  expected_at date,
  currency text not null default 'KES',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  received_quantity numeric(14,3) not null default 0 check (received_quantity >= 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  unique(purchase_request_id, inventory_item_id)
);
create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests(id) on delete restrict,
  reference text not null unique,
  received_by uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  notes text,
  idempotency_key text unique
);
create table if not exists public.purchase_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.purchase_receipts(id) on delete cascade,
  purchase_request_item_id uuid not null references public.purchase_request_items(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0)
);
create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'KES',
  method text not null check (method in ('mpesa','bank','card','cash')),
  reference text,
  status text not null default 'pending' check (status in ('pending','confirmed','failed','void')),
  recorded_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_approval_events (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.expenses add column if not exists workflow_status text not null default 'recorded';
alter table public.expenses add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.expenses add column if not exists approved_at timestamptz;
alter table public.expenses add column if not exists approval_note text;
alter table public.expenses add column if not exists paid_at timestamptz;
alter table public.expenses add column if not exists idempotency_key text;
alter table public.expenses add column if not exists updated_at timestamptz not null default now();
update public.invoices i set paid_at=coalesce(
  (select max(p.confirmed_at) from public.payments p where p.invoice_id=i.id and p.status in ('confirmed','reconciled')),
  i.issued_at,i.created_at
) where i.status='paid' and i.paid_at is null;
update public.expenses set workflow_status='recorded' where workflow_status is null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='expenses_workflow_status_check') then
    alter table public.expenses add constraint expenses_workflow_status_check
      check (workflow_status in ('pending_approval','approved','rejected','paid','recorded'));
  end if;
end $$;
create unique index if not exists expenses_idempotency_key_unique on public.expenses(idempotency_key) where idempotency_key is not null;

alter table public.order_approval_events enable row level security;
alter table public.quote_approval_events enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.purchase_request_items enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_items enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.expense_approval_events enable row level security;

revoke all on public.order_approval_events, public.quote_approval_events, public.suppliers,
  public.purchase_requests, public.purchase_request_items, public.purchase_receipts,
  public.purchase_receipt_items, public.supplier_payments, public.expense_approval_events
  from public, anon, authenticated;
grant select on public.order_approval_events, public.quote_approval_events, public.suppliers,
  public.purchase_requests, public.purchase_request_items, public.purchase_receipts,
  public.purchase_receipt_items, public.supplier_payments, public.expense_approval_events
  to authenticated;

drop policy if exists order_approval_staff_read on public.order_approval_events;
create policy order_approval_staff_read on public.order_approval_events for select to authenticated
using (public.has_any_role(array['super_admin','admin','sales','finance','production_manager','dispatch']::public.app_role[]));
drop policy if exists quote_approval_staff_read on public.quote_approval_events;
create policy quote_approval_staff_read on public.quote_approval_events for select to authenticated
using (public.has_any_role(array['super_admin','admin','sales','finance']::public.app_role[]));
drop policy if exists procurement_staff_read on public.suppliers;
create policy procurement_staff_read on public.suppliers for select to authenticated
using (public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[]));
drop policy if exists procurement_staff_manage on public.suppliers;
create policy procurement_staff_manage on public.suppliers for all to authenticated
using (public.has_any_role(array['super_admin','admin','finance']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','finance']::public.app_role[]));
drop policy if exists purchase_requests_staff_read on public.purchase_requests;
create policy purchase_requests_staff_read on public.purchase_requests for select to authenticated
using (public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[]));
drop policy if exists purchase_requests_staff_manage on public.purchase_requests;
drop policy if exists purchase_request_items_staff_read on public.purchase_request_items;
create policy purchase_request_items_staff_read on public.purchase_request_items for select to authenticated
using (public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[]));
drop policy if exists purchase_request_items_staff_manage on public.purchase_request_items;
drop policy if exists purchase_receipts_staff_read on public.purchase_receipts;
create policy purchase_receipts_staff_read on public.purchase_receipts for select to authenticated
using (public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[]));
drop policy if exists purchase_receipt_items_staff_read on public.purchase_receipt_items;
create policy purchase_receipt_items_staff_read on public.purchase_receipt_items for select to authenticated
using (public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[]));
drop policy if exists supplier_payments_staff_read on public.supplier_payments;
create policy supplier_payments_staff_read on public.supplier_payments for select to authenticated
using (public.has_any_role(array['super_admin','admin','finance']::public.app_role[]));
drop policy if exists expense_approval_staff_read on public.expense_approval_events;
create policy expense_approval_staff_read on public.expense_approval_events for select to authenticated
using (public.has_any_role(array['super_admin','admin','finance']::public.app_role[]));

create or replace function public.create_supplier(p_name text,p_phone text default null,p_email text default null)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_id uuid;
begin
  if not public.has_any_role(array['super_admin','admin','finance']::public.app_role[]) then raise exception 'Not authorized to manage suppliers'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Supplier name is required'; end if;
  insert into public.suppliers(name,phone,email,created_by)
    values(trim(p_name),nullif(trim(p_phone),''),nullif(lower(trim(p_email)),''),auth.uid()) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_supplier(text,text,text) from public, anon;
grant execute on function public.create_supplier(text,text,text) to authenticated;

create or replace function public.create_expense_record(p_expense_date date,p_category text,p_description text,p_amount numeric,p_payment_account text default null,p_reference text default null,p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_id uuid;
begin
  if not public.has_any_role(array['super_admin','admin','finance']::public.app_role[]) then raise exception 'Not authorized to record expenses'; end if;
  if nullif(trim(p_category),'') is null or nullif(trim(p_description),'') is null or p_amount is null or p_amount<=0 or nullif(trim(p_idempotency_key),'') is null then raise exception 'Category, description, positive amount and idempotency key are required'; end if;
  insert into public.expenses(expense_date,category,description,amount,payment_account,reference,recorded_by,workflow_status,idempotency_key)
    values(coalesce(p_expense_date,current_date),trim(p_category),trim(p_description),p_amount,nullif(trim(p_payment_account),''),nullif(trim(p_reference),''),auth.uid(),'pending_approval',trim(p_idempotency_key))
    on conflict (idempotency_key) where idempotency_key is not null do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.expenses where idempotency_key=trim(p_idempotency_key); return v_id; end if;
  insert into public.expense_approval_events(expense_id,from_status,to_status,actor_id) values(v_id,null,'pending_approval',auth.uid());
  return v_id;
end $$;
revoke all on function public.create_expense_record(date,text,text,numeric,text,text,text) from public, anon;
grant execute on function public.create_expense_record(date,text,text,numeric,text,text,text) to authenticated;

create or replace function public.decide_expense_record(p_expense_id uuid,p_decision text,p_note text default null)
returns void language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_expense public.expenses%rowtype;
begin
  if not public.has_any_role(array['super_admin','admin','finance']::public.app_role[]) then raise exception 'Not authorized to approve expenses'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  select * into v_expense from public.expenses where id=p_expense_id for update;
  if not found or v_expense.workflow_status <> 'pending_approval' then raise exception 'Only pending expenses can be reviewed'; end if;
  if v_expense.recorded_by=auth.uid() then raise exception 'The expense recorder cannot approve their own expense'; end if;
  update public.expenses set workflow_status=p_decision,approved_by=auth.uid(),approved_at=now(),approval_note=nullif(trim(p_note),''),updated_at=now() where id=p_expense_id;
  insert into public.expense_approval_events(expense_id,from_status,to_status,actor_id,note) values(p_expense_id,v_expense.workflow_status,p_decision,auth.uid(),nullif(trim(p_note),''));
end $$;
revoke all on function public.decide_expense_record(uuid,text,text) from public, anon;
grant execute on function public.decide_expense_record(uuid,text,text) to authenticated;

create or replace function public.mark_expense_paid(p_expense_id uuid,p_reference text default null)
returns void language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_expense public.expenses%rowtype;
begin
  if not public.has_any_role(array['super_admin','admin','finance']::public.app_role[]) then raise exception 'Not authorized to record expense payment'; end if;
  select * into v_expense from public.expenses where id=p_expense_id for update;
  if not found or v_expense.workflow_status not in ('approved','paid') then raise exception 'Only approved expenses can be paid'; end if;
  if v_expense.workflow_status='paid' then return; end if;
  update public.expenses set workflow_status='paid',paid_at=now(),reference=coalesce(nullif(trim(p_reference),''),reference) where id=p_expense_id;
  insert into public.expense_approval_events(expense_id,from_status,to_status,actor_id,note) values(p_expense_id,'approved','paid',auth.uid(),nullif(trim(p_reference),''));
end $$;
revoke all on function public.mark_expense_paid(uuid,text) from public, anon;
grant execute on function public.mark_expense_paid(uuid,text) to authenticated;

-- Expense status and amount changes are mediated by the audited RPCs.
revoke insert, update, delete on public.expenses from authenticated;
grant select on public.expenses to authenticated;

-- One transaction receives stock and writes both ledgers. A unique idempotency key prevents duplicate receipt posting.
create or replace function public.receive_purchase_request(
  p_purchase_request_id uuid, p_reference text, p_lines jsonb, p_idempotency_key text, p_notes text default null
) returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_receipt uuid; v_line jsonb; v_item public.purchase_request_items%rowtype; v_stock public.inventory_items%rowtype; v_qty numeric(14,3);
begin
  if not public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[]) then raise exception 'Not authorized to receive procurement'; end if;
  if nullif(trim(p_reference),'') is null or nullif(trim(p_idempotency_key),'') is null or coalesce(jsonb_typeof(p_lines),'') <> 'array' or jsonb_array_length(p_lines)=0 then raise exception 'Receipt reference, lines and idempotency key are required'; end if;
  select id into v_receipt from public.purchase_receipts where idempotency_key=p_idempotency_key;
  if v_receipt is not null then return v_receipt; end if;
  perform 1 from public.purchase_requests where id=p_purchase_request_id and status in ('approved','partially_received') for update;
  if not found then raise exception 'Only approved purchase requests can be received'; end if;
  insert into public.purchase_receipts(purchase_request_id,reference,received_by,notes,idempotency_key)
    values(p_purchase_request_id,trim(p_reference),auth.uid(),nullif(trim(p_notes),''),p_idempotency_key) returning id into v_receipt;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    select * into v_item from public.purchase_request_items where id=(v_line->>'item_id')::uuid and purchase_request_id=p_purchase_request_id for update;
    if not found then raise exception 'Receipt line does not belong to this purchase request'; end if;
    v_qty := (v_line->>'quantity')::numeric;
    if v_qty <= 0 or v_item.received_quantity + v_qty > v_item.quantity then raise exception 'Received quantity exceeds the approved quantity'; end if;
    select * into v_stock from public.inventory_items where id=v_item.inventory_item_id for update;
    insert into public.purchase_receipt_items(receipt_id,purchase_request_item_id,inventory_item_id,quantity,unit_cost)
      values(v_receipt,v_item.id,v_stock.id,v_qty,v_item.unit_cost);
    insert into public.inventory_movements(inventory_item_id,movement_type,quantity,unit_cost,notes,created_by)
      values(v_stock.id,'receipt',v_qty,v_item.unit_cost,'Purchase receipt '||trim(p_reference),auth.uid());
    update public.inventory_items set
      average_cost=case when quantity_on_hand+v_qty > 0 then ((quantity_on_hand*average_cost)+(v_qty*v_item.unit_cost))/(quantity_on_hand+v_qty) else v_item.unit_cost end,
      quantity_on_hand=quantity_on_hand+v_qty, updated_at=now() where id=v_stock.id;
    update public.purchase_request_items set received_quantity=received_quantity+v_qty where id=v_item.id;
  end loop;
  update public.purchase_requests pr set status=case when not exists(select 1 from public.purchase_request_items i where i.purchase_request_id=pr.id and i.received_quantity<i.quantity) then 'received' else 'partially_received' end, updated_at=now()
  where pr.id=p_purchase_request_id;
  return v_receipt;
end $$;
revoke all on function public.receive_purchase_request(uuid,text,jsonb,text,text) from public, anon;
grant execute on function public.receive_purchase_request(uuid,text,jsonb,text,text) to authenticated;

create or replace function public.create_purchase_request(p_supplier_id uuid, p_expected_at date, p_notes text, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_id uuid; v_line jsonb; v_item public.inventory_items%rowtype; v_count integer := 0; v_ref text;
begin
  if not public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[]) then raise exception 'Not authorized to request procurement'; end if;
  if coalesce(jsonb_typeof(p_lines),'') <> 'array' or jsonb_array_length(p_lines)=0 then raise exception 'Add at least one purchase line'; end if;
  if p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and is_active) then raise exception 'Select an active supplier'; end if;
  v_ref := 'PO-'||to_char(now(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.purchase_requests(reference,supplier_id,status,requested_by,expected_at,notes)
  values(v_ref,p_supplier_id,'submitted',auth.uid(),p_expected_at,nullif(trim(p_notes),'')) returning id into v_id;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    select * into v_item from public.inventory_items where id=(v_line->>'inventory_item_id')::uuid and is_active;
    if not found then raise exception 'A selected inventory item is unavailable'; end if;
    if coalesce((v_line->>'quantity')::numeric,0)<=0 or coalesce((v_line->>'unit_cost')::numeric,-1)<0 then raise exception 'Each line needs a positive quantity and non-negative unit cost'; end if;
    insert into public.purchase_request_items(purchase_request_id,inventory_item_id,description,quantity,unit_cost)
      values(v_id,v_item.id,coalesce(nullif(trim(v_line->>'description'),''),v_item.name),(v_line->>'quantity')::numeric,(v_line->>'unit_cost')::numeric);
    v_count := v_count+1;
  end loop;
  return v_id;
end $$;
revoke all on function public.create_purchase_request(uuid,date,text,jsonb) from public, anon;
grant execute on function public.create_purchase_request(uuid,date,text,jsonb) to authenticated;

create or replace function public.decide_purchase_request(p_request_id uuid,p_decision text,p_note text default null)
returns void language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_request public.purchase_requests%rowtype;
begin
  if not public.has_any_role(array['super_admin','admin','finance']::public.app_role[]) then raise exception 'Only admin or finance can approve procurement'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  select * into v_request from public.purchase_requests where id=p_request_id for update;
  if not found or v_request.status <> 'submitted' then raise exception 'Only submitted procurement can be reviewed'; end if;
  if p_decision='approved' and v_request.requested_by=auth.uid() then raise exception 'The requester cannot approve their own purchase request'; end if;
  update public.purchase_requests set status=p_decision,approved_by=auth.uid(),approved_at=now(),approval_note=nullif(trim(p_note),''),updated_at=now() where id=p_request_id;
end $$;
revoke all on function public.decide_purchase_request(uuid,text,text) from public, anon;
grant execute on function public.decide_purchase_request(uuid,text,text) to authenticated;

create or replace function public.record_supplier_payment(p_request_id uuid,p_amount numeric,p_method text,p_reference text,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_id uuid; v_received numeric(14,2); v_paid numeric(14,2);
begin
  if not public.has_any_role(array['super_admin','admin','finance']::public.app_role[]) then raise exception 'Only admin or finance can record supplier payments'; end if;
  if p_amount is null or p_amount<=0 or p_method is null or p_method not in ('mpesa','bank','card','cash') or nullif(trim(p_idempotency_key),'') is null then raise exception 'Valid amount, method and idempotency key are required'; end if;
  select id into v_id from public.supplier_payments where idempotency_key=p_idempotency_key;
  if v_id is not null then return v_id; end if;
  perform 1 from public.purchase_requests where id=p_request_id and status in ('partially_received','received') for update;
  if not found then raise exception 'Supplier payments can only be recorded after goods are received'; end if;
  select coalesce(sum(ri.received_quantity*ri.unit_cost),0) into v_received from public.purchase_request_items ri where ri.purchase_request_id=p_request_id;
  select coalesce(sum(sp.amount),0) into v_paid from public.supplier_payments sp where sp.purchase_request_id=p_request_id and sp.status='confirmed';
  if p_amount>v_received-v_paid then raise exception 'Payment exceeds received supplier balance'; end if;
  insert into public.supplier_payments(purchase_request_id,amount,method,reference,status,recorded_by,confirmed_at,idempotency_key)
    values(p_request_id,p_amount,p_method,nullif(trim(p_reference),''),'confirmed',auth.uid(),now(),p_idempotency_key) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.record_supplier_payment(uuid,numeric,text,text,text) from public, anon;
grant execute on function public.record_supplier_payment(uuid,numeric,text,text,text) to authenticated;

-- Keep procurement writes behind the validated, atomic RPCs above.
revoke insert, update, delete on public.purchase_requests, public.purchase_request_items,
  public.purchase_receipts, public.purchase_receipt_items, public.supplier_payments from authenticated;
revoke insert, update, delete on public.suppliers from authenticated;
grant select on public.purchase_requests, public.purchase_request_items, public.purchase_receipts,
  public.purchase_receipt_items, public.supplier_payments, public.suppliers to authenticated;

-- Role-checked inserts only; approval/status/amount fields remain writable exclusively by RPCs.
drop policy if exists suppliers_insert_admin on public.suppliers;
drop policy if exists expenses_select_finance on public.expenses;
create policy expenses_select_finance on public.expenses for select to authenticated
using (public.has_any_role(array['super_admin','admin','finance']::public.app_role[]));

create or replace function public.convert_accepted_quote(p_quote_id uuid)
returns table(order_id uuid, order_reference text, invoice_id uuid, invoice_number text)
language plpgsql security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare v_quote public.quote_requests%rowtype; v_order_id uuid; v_invoice_id uuid; v_reference text; v_invoice_number text; v_amount numeric(14,2);
begin
  if not public.has_any_role(array['super_admin','admin','sales']::public.app_role[]) then raise exception 'Not authorized to convert quotations'; end if;
  select * into v_quote from public.quote_requests where id=p_quote_id for update;
  if not found or v_quote.status <> 'accepted' then raise exception 'Only client-accepted quotations can be converted'; end if;
  if v_quote.converted_order_id is not null then raise exception 'This quotation already has an order'; end if;
  if v_quote.customer_id is null then raise exception 'Link this quotation to a client account before conversion'; end if;
  v_amount := coalesce(v_quote.quoted_amount,0);
  if v_amount<=0 then raise exception 'The accepted quotation must have a positive amount'; end if;

  v_reference := 'NCO-'||to_char(now(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.orders(reference,customer_id,customer_name,customer_email,customer_phone,payment_method,delivery_method,status,payment_status,customer_notes,assigned_to,subtotal,discount,tax,total,currency)
  values(v_reference,v_quote.customer_id,coalesce(nullif(trim(v_quote.company),''),v_quote.customer_name), v_quote.email,coalesce(nullif(trim(v_quote.phone),''),'Not provided'),
    'mpesa','collection','awaiting_review','unpaid','Converted from accepted quotation '||v_quote.reference,v_quote.assigned_to,
    v_amount,0,0,v_amount,coalesce(v_quote.currency,'KES')) returning id into v_order_id;
  insert into public.order_items(order_id,service_slug,service_name,configuration,quantity,estimated_amount,confirmed_amount)
  values(v_order_id,v_quote.service_slug,initcap(replace(v_quote.service_slug,'-',' ')),
    coalesce(v_quote.configuration,'{}'::jsonb)||jsonb_build_object('quotation_reference',v_quote.reference,'client_brief',v_quote.description),1,v_amount,v_amount);

  v_invoice_number := 'INV-'||to_char(now(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.invoices(order_id,invoice_number,customer_name,customer_email,subtotal,tax,total,amount_paid,status,issued_at,created_by)
  values(v_order_id,v_invoice_number,coalesce(nullif(v_quote.company,''),v_quote.customer_name),v_quote.email,v_amount,0,v_amount,0,'issued',now(),auth.uid())
  returning id into v_invoice_id;

  perform set_config('app.quote_conversion_context','quote_conversion_rpc',true);
  update public.quote_requests set status='converted',converted_order_id=v_order_id,converted_at=now(),updated_at=now() where id=p_quote_id;
  perform set_config('app.quote_conversion_context','',true);
  return query select v_order_id,v_reference,v_invoice_id,v_invoice_number;
exception when others then
  perform set_config('app.quote_conversion_context','',true);
  raise;
end $$;
revoke all on function public.convert_accepted_quote(uuid) from public, anon;
grant execute on function public.convert_accepted_quote(uuid) to authenticated;

create or replace function public.admin_sales_summary(p_from date default null,p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare result jsonb;
begin
  if not public.has_any_role(array['super_admin','admin','sales','finance']::public.app_role[]) then raise exception 'Not authorized to view the sales summary'; end if;
  if p_from is not null and p_to is not null and p_from>p_to then raise exception 'Invalid reporting period'; end if;
  select jsonb_build_object(
    'period',jsonb_build_object('from',p_from,'to',p_to),
    'orders',jsonb_build_object(
      'count',count(*) filter (where o.status<>'cancelled'),
      'active',count(*) filter (where o.status not in ('completed','cancelled')),
      'completed',count(*) filter (where o.status='completed'),
      'order_value',coalesce(sum(o.total) filter (where o.status<>'cancelled'),0),
      'completed_value',coalesce(sum(o.total) filter (where o.status='completed'),0)
    ),
    'collections',jsonb_build_object(
      'received',coalesce((select sum(p.amount) from public.payments p where p.currency='KES' and p.status in ('confirmed','reconciled') and (coalesce(p.confirmed_at,p.created_at) at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)),0),
      'outstanding',coalesce((select sum(greatest(0,i.total-i.amount_paid)) from public.invoices i where i.currency='KES' and i.status in ('issued','partially_paid')),0)
    ),
    'open_quotes',(select count(*) from public.quote_requests q where q.status in ('submitted','under_review','need_information') and (q.created_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)),
    'by_salesperson',coalesce((select jsonb_agg(jsonb_build_object('id',x.assignee_id,'name',x.name,'orders',x.orders,'order_value',x.order_value) order by x.order_value desc) from (
      select o.assigned_to assignee_id,coalesce(nullif(p.full_name,''),'Unassigned') name,count(*) orders,coalesce(sum(o.total),0) order_value
      from public.orders o left join public.profiles p on p.id=o.assigned_to
      where o.status<>'cancelled' and o.currency='KES' and (o.created_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)
      group by o.assigned_to,p.full_name order by sum(o.total) desc nulls last limit 10
    ) x),'[]'::jsonb),
    'by_customer',coalesce((select jsonb_agg(jsonb_build_object('name',x.customer_name,'email',x.customer_email,'orders',x.orders,'order_value',x.order_value) order by x.order_value desc) from (
      select o.customer_name,o.customer_email,count(*) orders,coalesce(sum(o.total),0) order_value from public.orders o
      where o.status<>'cancelled' and o.currency='KES' and (o.created_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)
      group by o.customer_name,o.customer_email order by sum(o.total) desc nulls last limit 10
    ) x),'[]'::jsonb),
    'by_service',coalesce((select jsonb_agg(jsonb_build_object('name',x.service_name,'quantity',x.quantity,'order_value',x.order_value) order by x.order_value desc) from (
      select oi.service_name,sum(oi.quantity) quantity,coalesce(sum(coalesce(oi.confirmed_amount,oi.estimated_amount,0)),0) order_value
      from public.order_items oi join public.orders o on o.id=oi.order_id
      where o.status<>'cancelled' and o.currency='KES' and (o.created_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)
      group by oi.service_name order by sum(coalesce(oi.confirmed_amount,oi.estimated_amount,0)) desc nulls last limit 10
    ) x),'[]'::jsonb)
  ) into result from public.orders o
  where o.currency='KES' and (o.created_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date);
  return result;
end $$;
revoke all on function public.admin_sales_summary(date,date) from public, anon;
grant execute on function public.admin_sales_summary(date,date) to authenticated;

create or replace function public.admin_finance_summary(p_from date default null, p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, auth, pg_temp as $$
declare result jsonb;
begin
  if not public.has_any_role(array['super_admin','admin','finance']::public.app_role[]) then raise exception 'Not authorized to view finance summary'; end if;
  if p_from is not null and p_to is not null and p_from > p_to then raise exception 'Invalid reporting period'; end if;
  select jsonb_build_object(
    'period', jsonb_build_object('from',p_from,'to',p_to),
    'orders', jsonb_build_object(
      'count',(select count(*) from public.orders o where (o.created_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)),
      'open',(select count(*) from public.orders o where o.status not in ('completed','cancelled')),
      'awaiting_review',(select count(*) from public.orders o where o.status in ('submitted','awaiting_review')),
      'in_production',(select count(*) from public.orders o where o.status in ('in_production','quality_check')),
      'artwork',(select count(*) from public.orders o where o.status in ('artwork_pending','awaiting_approval'))
    ),
    'invoices', jsonb_build_object(
      'issued_total',coalesce((select sum(i.total) from public.invoices i where i.status in ('issued','partially_paid','paid') and (i.issued_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)),0),
      'outstanding',coalesce((select sum(greatest(0,i.total-i.amount_paid)) from public.invoices i where i.status in ('issued','partially_paid')),0),
      'paid_count',coalesce((select count(*) from public.invoices i where i.status='paid' and (i.paid_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)),0),
      'unpaid_count',coalesce((select count(*) from public.invoices i where i.status in ('issued','partially_paid')),0)
    ),
    'payments', jsonb_build_object(
      'received',coalesce((select sum(p.amount) from public.payments p where p.status in ('confirmed','reconciled') and p.currency='KES' and (coalesce(p.confirmed_at,p.created_at) at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)),0),
      'pending_count',coalesce((select count(*) from public.payments p where p.status in ('pending','initiated')),0),
      'by_method',coalesce((select jsonb_object_agg(x.method,x.amount) from (select p.method,sum(p.amount) amount from public.payments p where p.status in ('confirmed','reconciled') and p.currency='KES' and (coalesce(p.confirmed_at,p.created_at) at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date) group by p.method) x),'{}'::jsonb)
    ),
    'expenses',jsonb_build_object(
      'recorded',coalesce((select sum(e.amount) from public.expenses e where e.expense_date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date) and e.workflow_status in ('approved','paid','recorded')),0),
      'pending_approval',coalesce((select count(*) from public.expenses e where e.workflow_status='pending_approval'),0)
    ),
    'procurement',jsonb_build_object(
      'pending_approval',coalesce((select count(*) from public.purchase_requests r where r.status='submitted'),0),
      'received_value',coalesce((select sum(ri.received_quantity*ri.unit_cost) from public.purchase_request_items ri join public.purchase_requests r on r.id=ri.purchase_request_id where r.status in ('partially_received','received') and r.updated_at::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)),0),
      'supplier_payables',greatest(0,coalesce((select sum(ri.received_quantity*ri.unit_cost) from public.purchase_request_items ri join public.purchase_requests r on r.id=ri.purchase_request_id where r.status in ('partially_received','received')),0)-coalesce((select sum(sp.amount) from public.supplier_payments sp where sp.status='confirmed'),0))
    ),
    'quotes',jsonb_build_object(
      'open',(select count(*) from public.quote_requests q where q.status in ('submitted','under_review','need_information')),
      'quoted_value',coalesce((select sum(qr.quoted_amount) from public.quote_requests qr where qr.status='quoted' and (qr.updated_at at time zone 'Africa/Nairobi')::date between coalesce(p_from,'0001-01-01'::date) and coalesce(p_to,'9999-12-31'::date)),0)
    ),
    'inventory',jsonb_build_object(
      'low_stock',coalesce((select count(*) from public.inventory_items i where i.is_active and i.quantity_on_hand<=i.reorder_level),0),
      'valuation',coalesce((select sum(i.quantity_on_hand*i.average_cost) from public.inventory_items i where i.is_active),0)
    )
  ) into result;
  return result;
end $$;
revoke all on function public.admin_finance_summary(date,date) from public, anon;
grant execute on function public.admin_finance_summary(date,date) to authenticated;
comment on function public.admin_finance_summary(date,date) is 'Role-gated operational and financial aggregates from live ledger rows; received is confirmed/reconciled only. Expenses are recorded costs, not a claim of profitability.';
