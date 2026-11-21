-- Keep paid orders out of the awaiting-payment workflow and remove linked
-- invoice rows when an administrator deletes an order.

update public.orders o
set payment_status = 'paid',
    status = case when o.status = 'awaiting_payment' then 'awaiting_review' else o.status end,
    updated_at = now()
where o.payment_status <> 'paid'
  and exists (
    select 1 from public.invoices i
    where i.order_id = o.id
      and (i.status = 'paid' or (i.total > 0 and i.amount_paid >= i.total))
  );

update public.orders
set status = 'awaiting_review', updated_at = now()
where payment_status = 'paid' and status = 'awaiting_payment';

create or replace function public.record_admin_invoice_payment(p_invoice_id uuid, p_method text default 'bank')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invoice public.invoices%rowtype; v_payment uuid; v_balance numeric(14,2);
begin
  if not public.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'Only an administrator can record offline payments';
  end if;
  if p_method not in ('mpesa','bank','card') then raise exception 'Unsupported payment method'; end if;
  select * into v_invoice from public.invoices where id=p_invoice_id for update;
  if not found or v_invoice.order_id is null or v_invoice.status in ('draft','void','paid') then
    raise exception 'Invoice cannot accept a manual payment';
  end if;
  v_balance := greatest(0,v_invoice.total-v_invoice.amount_paid);
  if v_balance <= 0 then raise exception 'Invoice has no outstanding balance'; end if;

  insert into public.payments(order_id,invoice_id,method,amount,currency,status,provider,transaction_reference,recorded_by,confirmed_at)
  values(v_invoice.order_id,v_invoice.id,p_method,v_balance,'KES','confirmed','manual',
    'ADMIN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),auth.uid(),now())
  returning id into v_payment;

  update public.invoices set amount_paid=total,status='paid' where id=p_invoice_id returning * into v_invoice;
  update public.orders
  set payment_status='paid',
      status=case when status='awaiting_payment' then 'awaiting_review' else status end,
      updated_at=now()
  where id=v_invoice.order_id;

  insert into public.payment_email_outbox(payment_id,invoice_id,customer_email,customer_name,invoice_number,
      invoice_total,amount_paid,prior_amount_paid,payment_amount,transaction_reference,provider_reference,payment_method)
  values(v_payment,v_invoice.id,v_invoice.customer_email,v_invoice.customer_name,v_invoice.invoice_number,
      v_invoice.total,v_invoice.total-v_balance,v_invoice.amount_paid,v_balance,'ADMIN-OFFLINE','ADMIN-OFFLINE',p_method)
  on conflict(payment_id) do nothing;
  insert into public.payment_admin_notifications(payment_id) values(v_payment) on conflict(payment_id) do nothing;
  return v_payment;
end;
$$;
revoke all on function public.record_admin_invoice_payment(uuid,text) from public, anon;
grant execute on function public.record_admin_invoice_payment(uuid,text) to authenticated;

create or replace function public.confirm_payhero_payment(
  p_external_reference text,
  p_provider_reference text,
  p_transaction_reference text,
  p_paid_amount numeric,
  p_phone text
) returns table(payment_id uuid, invoice_id uuid, order_id uuid, customer_id uuid,
  customer_name text, customer_email text, invoice_number text, invoice_total numeric,
  amount_paid numeric, payment_amount numeric, payment_method text)
language plpgsql security definer set search_path = public as $$
declare
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_order public.orders%rowtype;
begin
  select * into v_payment from public.payments
  where provider='payhero' and provider_reference=p_external_reference for update;
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

  update public.payments set status='confirmed',transaction_reference=p_transaction_reference,
    confirmed_at=now(),failure_reason=null where id=v_payment.id;
  update public.invoices set amount_paid=least(total,amount_paid+p_paid_amount),
    status=case when amount_paid+p_paid_amount>=total then 'paid' else 'partially_paid' end
  where id=v_invoice.id returning * into v_invoice;
  update public.orders
  set payment_status=case when v_invoice.amount_paid>=v_invoice.total then 'paid' else 'partially_paid' end,
      status=case when v_invoice.amount_paid>=v_invoice.total and status='awaiting_payment' then 'awaiting_review' else status end,
      updated_at=now()
  where id=v_order.id;

  insert into public.payment_email_outbox(payment_id,invoice_id,customer_email,customer_name,invoice_number,
      invoice_total,amount_paid,prior_amount_paid,payment_amount,transaction_reference,provider_reference,payment_method)
  values(v_payment.id,v_invoice.id,v_invoice.customer_email,v_invoice.customer_name,v_invoice.invoice_number,
      v_invoice.total,v_invoice.amount_paid-v_payment.amount,v_invoice.amount_paid,v_payment.amount,
      p_transaction_reference,p_provider_reference,v_payment.method)
  on conflict(payment_id) do nothing;
  insert into public.payment_admin_notifications(payment_id) values(v_payment.id) on conflict(payment_id) do nothing;

  return query select v_payment.id,v_invoice.id,v_order.id,v_order.customer_id,
    v_invoice.customer_name,v_invoice.customer_email,v_invoice.invoice_number,
    v_invoice.total,v_invoice.amount_paid,v_payment.amount,v_payment.method;
end;
$$;
revoke all on function public.confirm_payhero_payment(text,text,text,numeric,text) from public, anon, authenticated;
grant execute on function public.confirm_payhero_payment(text,text,text,numeric,text) to service_role;

create or replace function public.delete_admin_order(p_order_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'Only an administrator can delete orders';
  end if;
  if not exists(select 1 from public.orders where id=p_order_id) then raise exception 'Order not found'; end if;
  delete from public.projects where order_id=p_order_id;
  delete from public.invoices where order_id=p_order_id;
  delete from public.orders where id=p_order_id;
end;
$$;
revoke all on function public.delete_admin_order(uuid) from public, anon;
grant execute on function public.delete_admin_order(uuid) to authenticated;

create or replace function public.delete_admin_order_for_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_order_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.has_any_role(array['admin','finance']::public.app_role[]) then
    raise exception 'Only admins or finance staff can revoke invoices';
  end if;
  select order_id into v_order_id from public.invoices where id=p_invoice_id;
  if not found then raise exception 'Invoice not found'; end if;
  if v_order_id is null then delete from public.invoices where id=p_invoice_id; return; end if;
  delete from public.projects where order_id=v_order_id;
  delete from public.invoices where order_id=v_order_id;
  delete from public.orders where id=v_order_id;
end;
$$;
revoke all on function public.delete_admin_order_for_invoice(uuid) from public, anon;
grant execute on function public.delete_admin_order_for_invoice(uuid) to authenticated, service_role;

drop policy if exists "Admins delete order artwork" on storage.objects;
create policy "Admins delete order artwork" on storage.objects
for delete to authenticated using (
  bucket_id='order-artwork' and public.has_any_role(array['admin']::public.app_role[])
);
