-- A PayHero status/callback must include the Safaricom receipt before money
-- can settle an invoice. This guards the trusted RPC as well as the Edge Function.
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
  if nullif(trim(coalesce(p_transaction_reference, '')), '') is null
    or p_paid_amount is null or p_paid_amount <= 0 then
    return;
  end if;

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

  update public.payments set status='confirmed',transaction_reference=trim(p_transaction_reference),
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
