-- Fix invoice subtotal calculation in create_admin_manual_order
-- Subtotal should be p_amount (service + design), NOT v_total (which includes delivery)

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
  -- FIX: subtotal should be p_amount (excludes delivery), total is v_total (includes delivery)
  insert into public.invoices(order_id,invoice_number,customer_name,customer_email,subtotal,tax,total,amount_paid,status,issued_at,created_by)
    values(v_order_id,v_invoice_number,trim(p_customer_name),lower(trim(p_customer_email)),p_amount,0,v_total,0,'issued',now(),auth.uid()) returning id into v_invoice_id;
  insert into public.payments(order_id,invoice_id,method,amount,status) values(v_order_id,v_invoice_id,p_payment_method,v_total,'pending');
  return query select v_order_id,v_reference,v_invoice_id,v_invoice_number;
end $$;
