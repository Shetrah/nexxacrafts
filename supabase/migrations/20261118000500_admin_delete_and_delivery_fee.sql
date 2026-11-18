create or replace function public.delete_admin_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'Only an administrator can delete orders';
  end if;
  delete from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
end;
$$;
revoke all on function public.delete_admin_order(uuid) from public, anon;
grant execute on function public.delete_admin_order(uuid) to authenticated;

create or replace function public.delete_admin_order_for_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_order_id uuid;
begin
  if not public.has_any_role(array['admin','finance']::public.app_role[]) then raise exception 'Only admins or finance staff can revoke invoices'; end if;
  select order_id into v_order_id from public.invoices where id=p_invoice_id;
  if v_order_id is not null then delete from public.orders where id=v_order_id; end if;
  if not found then raise exception 'Invoice or linked order not found'; end if;
end $$;
revoke all on function public.delete_admin_order_for_invoice(uuid) from public,anon;
grant execute on function public.delete_admin_order_for_invoice(uuid) to service_role;

create or replace function public.record_admin_invoice_payment(p_invoice_id uuid, p_method text default 'bank')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invoice public.invoices%rowtype; v_payment uuid; v_balance numeric(14,2);
begin
  if not public.has_any_role(array['admin']::public.app_role[]) then raise exception 'Only an administrator can record offline payments'; end if;
  if p_method not in ('mpesa','bank','card') then raise exception 'Unsupported payment method'; end if;
  select * into v_invoice from public.invoices where id=p_invoice_id for update;
  if not found or v_invoice.order_id is null or v_invoice.status in ('draft','void','paid') then raise exception 'Invoice cannot accept a manual payment'; end if;
  v_balance := greatest(0,v_invoice.total-v_invoice.amount_paid);
  if v_balance <= 0 then raise exception 'Invoice has no outstanding balance'; end if;
  insert into public.payments(order_id,invoice_id,method,amount,currency,status,provider,transaction_reference,recorded_by,confirmed_at)
  values(v_invoice.order_id,v_invoice.id,p_method,v_balance,'KES','confirmed','manual','ADMIN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),auth.uid(),now()) returning id into v_payment;
  update public.invoices set amount_paid=total,status='paid' where id=p_invoice_id;
  update public.orders set payment_status='paid',status=case when status='awaiting_payment' then 'awaiting_review' else status end,updated_at=now() where id=v_invoice.order_id;
  insert into public.payment_email_outbox(payment_id,invoice_id,customer_email,customer_name,invoice_number,invoice_total,amount_paid,prior_amount_paid,payment_amount,transaction_reference,provider_reference,payment_method)
    values(v_payment,v_invoice.id,v_invoice.customer_email,v_invoice.customer_name,v_invoice.invoice_number,v_invoice.total,v_invoice.total-v_balance,v_invoice.amount_paid,v_balance,'ADMIN-OFFLINE','ADMIN-OFFLINE',p_method)
    on conflict(payment_id) do nothing;
  insert into public.payment_admin_notifications(payment_id) values(v_payment) on conflict(payment_id) do nothing;
  return v_payment;
end;
$$;
revoke all on function public.record_admin_invoice_payment(uuid,text) from public, anon;
grant execute on function public.record_admin_invoice_payment(uuid,text) to authenticated;

create or replace function public.create_admin_manual_order(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_payment_method text, p_delivery_method text, p_delivery_address text,
  p_delivery_instructions text, p_customer_notes text, p_service_slug text,
  p_configuration jsonb, p_quantity integer, p_amount numeric, p_delivery_fee numeric default 0
) returns table(order_id uuid, reference text, invoice_id uuid, invoice_number text)
language plpgsql security definer set search_path=public as $$
declare
  v_order_id uuid; v_invoice_id uuid; v_reference text; v_invoice_number text;
  v_service public.services%rowtype; v_total numeric(14,2); v_quantity integer;
begin
  if not public.has_any_role(array['admin']::public.app_role[]) then raise exception 'Only an administrator can enter a manual order'; end if;
  if p_delivery_method not in ('collection','local_delivery','courier') then raise exception 'Unsupported delivery method'; end if;
  if p_delivery_fee is null or p_delivery_fee<0 or (p_delivery_method='collection' and p_delivery_fee<>0) then raise exception 'Enter a valid delivery fee'; end if;
  if p_amount is null or p_amount<0 then raise exception 'Enter a valid order amount'; end if;
  select * into v_service from public.services where slug=p_service_slug and is_active;
  if not found then raise exception 'Selected service is not available'; end if;
  perform public.service_option_price(p_service_slug,coalesce(p_configuration,'{}'::jsonb));
  v_quantity:=greatest(1,coalesce(p_quantity,1)); v_total:=p_amount+p_delivery_fee;
  v_reference:='NCO-'||to_char(timezone('utc',now()),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  v_invoice_number:='INV-'||to_char(timezone('utc',now()),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  insert into public.orders(reference,customer_id,customer_name,customer_email,customer_phone,payment_method,delivery_method,delivery_address,delivery_instructions,status,payment_status,customer_notes,subtotal,tax,total)
    values(v_reference,null,trim(p_customer_name),lower(trim(p_customer_email)),trim(p_customer_phone),p_payment_method,p_delivery_method,nullif(trim(p_delivery_address),''),nullif(trim(p_delivery_instructions),''),'awaiting_payment','unpaid',nullif(trim(p_customer_notes),''),v_total,0,v_total) returning id into v_order_id;
  insert into public.order_items(order_id,service_slug,service_name,configuration,quantity,estimated_amount,confirmed_amount,files)
    values(v_order_id,v_service.slug,v_service.name,coalesce(p_configuration,'{}'::jsonb)||jsonb_build_object('quantity',v_quantity,'delivery_fee',p_delivery_fee),v_quantity,v_total,v_total,'{}');
  insert into public.invoices(order_id,invoice_number,customer_name,customer_email,subtotal,tax,total,amount_paid,status,issued_at,created_by)
    values(v_order_id,v_invoice_number,trim(p_customer_name),lower(trim(p_customer_email)),v_total,0,v_total,0,'issued',now(),auth.uid()) returning id into v_invoice_id;
  insert into public.payments(order_id,invoice_id,method,amount,status) values(v_order_id,v_invoice_id,p_payment_method,v_total,'pending');
  return query select v_order_id,v_reference,v_invoice_id,v_invoice_number;
end $$;
revoke all on function public.create_admin_manual_order(text,text,text,text,text,text,text,text,text,jsonb,integer,numeric,numeric) from public,anon;
grant execute on function public.create_admin_manual_order(text,text,text,text,text,text,text,text,text,jsonb,integer,numeric,numeric) to authenticated;
