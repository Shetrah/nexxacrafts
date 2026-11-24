-- Photo mounts use an explicit per-size rate. Treat that value as the full
-- per-photo price, never as an add-on to a generic service rate.
create or replace function public.service_option_price(p_slug text, p_config jsonb)
returns numeric
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  service_fields jsonb;
  field jsonb;
  selected text;
  size_selected text;
  size_price numeric;
  finish_price numeric := 0;
begin
  select s.fields into service_fields
  from public.services s
  where s.slug = p_slug and s.is_active = true;

  if p_slug = 'photo-mounting' then
    if not exists (
      select 1 from public.pricing_rates pr
      where pr.service_slug = p_slug and pr.active = true
    ) then
      raise exception 'Photo mounting is not currently available for checkout.';
    end if;

    size_selected := nullif(p_config->>'mounting_size', '');
    if size_selected is null then
      raise exception 'Select a size for every photo mount.';
    end if;

    select greatest(0, coalesce(nullif(f.value->'optionPrices'->>size_selected, '')::numeric, 0))
      into size_price
    from jsonb_array_elements(coalesce(service_fields, '[]'::jsonb)) as f(value)
    where f.value->>'name' = 'mounting_size'
      and coalesce(f.value->'options', '[]'::jsonb) @> jsonb_build_array(size_selected);

    if not found or coalesce(size_price, 0) <= 0 then
      raise exception 'No active price is configured for size %. Ask the team to update photo mounting prices.', size_selected;
    end if;

    select greatest(0, coalesce(nullif(f.value->'optionPrices'->>(p_config->>'mounting_finish'), '')::numeric, 0))
      into finish_price
    from jsonb_array_elements(coalesce(service_fields, '[]'::jsonb)) as f(value)
    where f.value->>'name' = 'mounting_finish'
      and coalesce(f.value->'options', '[]'::jsonb) @> jsonb_build_array(p_config->>'mounting_finish');

    return size_price + coalesce(finish_price, 0);
  end if;

  -- Other services continue to use select-option prices as add-ons.
  for field in select value from jsonb_array_elements(coalesce(service_fields, '[]'::jsonb)) loop
    if field->>'type' <> 'select' then continue; end if;
    selected := nullif(p_config->>(field->>'name'), '');
    if selected is null then continue; end if;
    if not (coalesce(field->'options', '[]'::jsonb) @> jsonb_build_array(selected)) then
      raise exception 'Invalid selection for %', field->>'label';
    end if;
    finish_price := finish_price + greatest(0, coalesce(nullif(field->'optionPrices'->>selected, '')::numeric, 0));
  end loop;
  return finish_price;
end;
$$;
revoke all on function public.service_option_price(text, jsonb) from public, anon;
grant execute on function public.service_option_price(text, jsonb) to authenticated;

-- Replace the active order RPC body with the existing trusted pricing logic,
-- changing photo-mount pricing to size_price × quantity and excluding generic
-- rate/setup values for that service. (The full body is copied from migration
-- 20261117001100 so deployment remains an ordinary additive migration.)
create or replace function public.create_customer_order(
  p_reference text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_payment_method text,
  p_delivery_method text,
  p_delivery_address text,
  p_delivery_instructions text,
  p_customer_notes text,
  p_items jsonb
)
returns table(id uuid, reference text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  new_order public.orders%rowtype;
  item jsonb;
  cfg jsonb;
  rate_row public.pricing_rates%rowtype;
  service_row public.services%rowtype;
  item_slug text;
  item_qty integer;
  item_estimate numeric(14,2);
  option_price numeric(14,2);
  estimate_total numeric(14,2) := 0;
  has_unpriced boolean := false;
  v_width numeric;
  v_height numeric;
begin
  if auth.uid() is null then raise exception 'Sign in is required to place an order'; end if;
  if nullif(trim(p_customer_name),'') is null or nullif(trim(p_customer_email),'') is null or nullif(trim(p_customer_phone),'') is null then
    raise exception 'Customer name, email and phone are required';
  end if;
  if p_payment_method is null or p_payment_method not in ('mpesa','bank','card') then raise exception 'Unsupported payment method'; end if;
  if p_delivery_method is null or p_delivery_method not in ('collection','local_delivery','courier') then raise exception 'Unsupported delivery method'; end if;
  if p_delivery_method in ('local_delivery','courier') and nullif(trim(p_delivery_address),'') is null then raise exception 'A delivery address is required'; end if;
  if coalesce(jsonb_typeof(p_items),'') <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one order item is required'; end if;

  for item in select value from jsonb_array_elements(p_items) loop
    item_slug := item->>'serviceSlug';
    cfg := coalesce(item->'configuration','{}'::jsonb);
    item_qty := greatest(1, coalesce(nullif(item->>'quantity','')::integer,1));
    item_estimate := null;
    select * into service_row from public.services s where s.slug=item_slug and s.is_active=true;
    if not found then raise exception 'The selected service is not available'; end if;
    option_price := public.service_option_price(item_slug, cfg);

    if item_slug = 'photo-mounting' then
      item_estimate := round(option_price * item_qty, 2);
    else
      select * into rate_row from public.pricing_rates pr where pr.service_slug=item_slug and pr.active=true and pr.unit_rate > 0 for share;
      if found then
        if item_slug = 'banner-printing' then
          v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
          if v_width > 0 and v_height > 0 then
            if lower(rate_row.unit_label) in ('m²','m2','sqm','square metre','square meter','m² (cm input)','cm → m²') then
              item_estimate := round((((v_width/100)*(v_height/100))*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2);
            else item_estimate := round((v_width*v_height*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
          end if;
        elsif item_slug = 'sticker-printing' then
          v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
          if v_width > 0 and v_height > 0 then
            if lower(rate_row.unit_label) in ('m²','m2','sqm','square metre','square meter','m² (cm input)','cm → m²') then
              item_estimate := round((((v_width/100)*(v_height/100))*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2);
            else item_estimate := round(((v_width*v_height/100)*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
          end if;
        else item_estimate := round((item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
      end if;
      if item_estimate is null and option_price > 0 then item_estimate := round(option_price*item_qty,2);
      elsif item_estimate is not null then item_estimate := round(item_estimate+option_price*item_qty,2); end if;
    end if;

    if item_estimate is null then has_unpriced := true; else estimate_total := estimate_total+item_estimate; end if;
  end loop;

  insert into public.orders (reference,customer_id,customer_name,customer_email,customer_phone,payment_method,delivery_method,delivery_address,delivery_instructions,status,payment_status,customer_notes,subtotal,total)
  values (p_reference,auth.uid(),p_customer_name,p_customer_email,p_customer_phone,p_payment_method,p_delivery_method,nullif(trim(p_delivery_address),''),p_delivery_instructions,'awaiting_review','unpaid',p_customer_notes,case when has_unpriced then null else estimate_total end,case when has_unpriced then null else estimate_total end)
  returning * into new_order;

  for item in select value from jsonb_array_elements(p_items) loop
    item_slug := item->>'serviceSlug';
    cfg := coalesce(item->'configuration','{}'::jsonb);
    item_qty := greatest(1,coalesce(nullif(item->>'quantity','')::integer,1));
    item_estimate := null;
    select * into service_row from public.services where slug=item_slug;
    option_price := public.service_option_price(item_slug, cfg);
    if item_slug = 'photo-mounting' then
      item_estimate := round(option_price * item_qty, 2);
    else
      select * into rate_row from public.pricing_rates pr where pr.service_slug=item_slug and pr.active=true and pr.unit_rate>0 for share;
      if found then
        if item_slug='banner-printing' then
          v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
          if v_width>0 and v_height>0 then
            if lower(rate_row.unit_label) in ('m²','m2','sqm','square metre','square meter','m² (cm input)','cm → m²') then item_estimate := round((((v_width/100)*(v_height/100))*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2);
            else item_estimate := round((v_width*v_height*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
          end if;
        elsif item_slug='sticker-printing' then
          v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
          if v_width>0 and v_height>0 then
            if lower(rate_row.unit_label) in ('m²','m2','sqm','square metre','square meter','m² (cm input)','cm → m²') then item_estimate := round((((v_width/100)*(v_height/100))*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2);
            else item_estimate := round(((v_width*v_height/100)*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
          end if;
        else item_estimate := round((item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
      end if;
      if item_estimate is null and option_price>0 then item_estimate := round(option_price*item_qty,2);
      elsif item_estimate is not null then item_estimate := round(item_estimate+option_price*item_qty,2); end if;
    end if;
    insert into public.order_items (order_id,service_slug,service_name,configuration,quantity,estimated_amount,files)
    values (new_order.id,item_slug,coalesce(item->>'serviceName',item_slug),cfg,item_qty,item_estimate,coalesce(array(select jsonb_array_elements_text(coalesce(item->'files','[]'::jsonb))),'{}'));
  end loop;

  insert into public.payments (order_id,method,amount,status) values (new_order.id,p_payment_method,case when has_unpriced then null else estimate_total end,'pending');
  return query select new_order.id,new_order.reference;
end;
$$;
revoke all on function public.create_customer_order(text,text,text,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.create_customer_order(text,text,text,text,text,text,text,text,text,jsonb) to authenticated;
