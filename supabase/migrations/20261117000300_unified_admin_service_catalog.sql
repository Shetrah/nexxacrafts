-- Consolidate super_admin into admin and make the service catalogue authoritative.
update public.profiles set role = 'admin'::public.app_role where role = 'super_admin'::public.app_role;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_role_no_super_admin') then
    alter table public.profiles add constraint profiles_role_no_super_admin check (role <> 'super_admin'::public.app_role);
  end if;
end $$;

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.role is distinct from new.role and current_user not in ('postgres','service_role') and not public.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'Only an administrator can change staff roles';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() or public.has_any_role(array['admin']::public.app_role[]))
with check (id = auth.uid() or public.has_any_role(array['admin']::public.app_role[]));

-- Keep the policies aligned with the single administrator role.
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services for select to anon, authenticated
using (is_active or public.has_any_role(array['admin']::public.app_role[]));
drop policy if exists services_admin_manage on public.services;
create policy services_admin_manage on public.services for all to authenticated
using (public.has_any_role(array['admin']::public.app_role[]))
with check (public.has_any_role(array['admin']::public.app_role[]));
drop policy if exists pricing_public_read on public.pricing_rates;
create policy pricing_public_read on public.pricing_rates for select to anon, authenticated
using (active or public.has_any_role(array['admin','sales']::public.app_role[]));
drop policy if exists pricing_manage on public.pricing_rates;
create policy pricing_manage on public.pricing_rates for all to authenticated
using (public.has_any_role(array['admin','sales']::public.app_role[]))
with check (public.has_any_role(array['admin','sales']::public.app_role[]));
drop policy if exists company_settings_admin_all on public.company_settings;
create policy company_settings_admin_all on public.company_settings for all to authenticated
using (public.has_any_role(array['admin']::public.app_role[]))
with check (public.has_any_role(array['admin']::public.app_role[]));
drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
using (public.has_any_role(array['admin']::public.app_role[]));
drop policy if exists orders_select_owner_or_staff on public.orders;
create policy orders_select_owner_or_staff on public.orders for select to authenticated
using (customer_id = auth.uid() or public.has_any_role(array['admin','sales','finance','designer','print_operator','laser_operator','developer','production_manager','dispatch']::public.app_role[]));
drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders for update to authenticated
using (public.has_any_role(array['admin','sales','finance','production_manager','dispatch']::public.app_role[]))
with check (public.has_any_role(array['admin','sales','finance','production_manager','dispatch']::public.app_role[]));
drop policy if exists order_items_select_owner_or_staff on public.order_items;
create policy order_items_select_owner_or_staff on public.order_items for select to authenticated using (
  exists(select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()) or public.has_any_role(array['admin','sales','finance','designer','print_operator','laser_operator','developer','production_manager','dispatch']::public.app_role[])
);
drop policy if exists order_items_update_staff on public.order_items;
create policy order_items_update_staff on public.order_items for update to authenticated
using (public.has_any_role(array['admin','sales','designer','print_operator','laser_operator','developer','production_manager']::public.app_role[]))
with check (public.has_any_role(array['admin','sales','designer','print_operator','laser_operator','developer','production_manager']::public.app_role[]));
drop policy if exists payments_select_owner_or_staff on public.payments;
create policy payments_select_owner_or_staff on public.payments for select to authenticated using (
  exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()) or public.has_any_role(array['admin','finance','sales']::public.app_role[])
);
drop policy if exists payments_update_finance on public.payments;
create policy payments_update_finance on public.payments for update to authenticated
using (public.has_any_role(array['admin','finance']::public.app_role[]))
with check (public.has_any_role(array['admin','finance']::public.app_role[]));
drop policy if exists production_staff_all on public.production_jobs;
create policy production_staff_all on public.production_jobs for all to authenticated
using (public.has_any_role(array['admin','production_manager','designer','print_operator','laser_operator','developer','dispatch']::public.app_role[]))
with check (public.has_any_role(array['admin','production_manager','designer','print_operator','laser_operator','developer','dispatch']::public.app_role[]));
drop policy if exists proof_select_owner_or_staff on public.proof_reviews;
create policy proof_select_owner_or_staff on public.proof_reviews for select to authenticated using (
  exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and o.customer_id=auth.uid()) or public.has_any_role(array['admin','production_manager','designer']::public.app_role[])
);
drop policy if exists proof_update_customer_or_staff on public.proof_reviews;
create policy proof_update_customer_or_staff on public.proof_reviews for update to authenticated using (
  exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and o.customer_id=auth.uid()) or public.has_any_role(array['admin','production_manager','designer']::public.app_role[])
) with check (
  exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and o.customer_id=auth.uid()) or public.has_any_role(array['admin','production_manager','designer']::public.app_role[])
);
drop policy if exists invoices_customer_or_staff_select on public.invoices;
create policy invoices_customer_or_staff_select on public.invoices for select to authenticated using (
  (order_id is not null and exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid())) or public.has_any_role(array['admin','finance','sales']::public.app_role[])
);
drop policy if exists projects_owner_or_staff on public.projects;
create policy projects_owner_or_staff on public.projects for all to authenticated using (
  customer_id=auth.uid() or public.has_any_role(array['admin','developer','designer','production_manager']::public.app_role[])
) with check (
  customer_id=auth.uid() or public.has_any_role(array['admin','developer','designer','production_manager']::public.app_role[])
);
drop policy if exists tasks_staff_all on public.project_tasks;
create policy tasks_staff_all on public.project_tasks for all to authenticated using (
  public.has_any_role(array['admin','developer','designer','production_manager']::public.app_role[])
) with check (
  public.has_any_role(array['admin','developer','designer','production_manager']::public.app_role[])
);
drop policy if exists customer_files_read_own_or_staff on storage.objects;
create policy customer_files_read_own_or_staff on storage.objects for select to authenticated using (
  bucket_id='customer-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_any_role(array['admin','sales','designer','print_operator','laser_operator','developer','production_manager','dispatch']::public.app_role[]))
);
drop policy if exists customer_files_update_own_or_staff on storage.objects;
create policy customer_files_update_own_or_staff on storage.objects for update to authenticated using (
  bucket_id='customer-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_any_role(array['admin']::public.app_role[]))
) with check (
  bucket_id='customer-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_any_role(array['admin']::public.app_role[]))
);
drop policy if exists customer_files_delete_own_or_staff on storage.objects;
create policy customer_files_delete_own_or_staff on storage.objects for delete to authenticated using (
  bucket_id='customer-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_any_role(array['admin']::public.app_role[]))
);
drop policy if exists profiles_select_self_or_staff on public.profiles;
create policy profiles_select_self_or_staff on public.profiles for select to authenticated
using (id = auth.uid() or public.has_any_role(array['admin','sales','finance','production_manager']::public.app_role[]));
drop policy if exists quote_select_owner_or_staff on public.quote_requests;
create policy quote_select_owner_or_staff on public.quote_requests for select to authenticated
using (customer_id = auth.uid() or public.has_any_role(array['admin','sales','finance']::public.app_role[]));
drop policy if exists quote_update_staff on public.quote_requests;
create policy quote_update_staff on public.quote_requests for update to authenticated
using (public.has_any_role(array['admin','sales']::public.app_role[]))
with check (public.has_any_role(array['admin','sales']::public.app_role[]));
drop policy if exists proof_staff_insert on public.proof_reviews;
create policy proof_staff_insert on public.proof_reviews for insert to authenticated
with check (public.has_any_role(array['admin','production_manager','designer']::public.app_role[]));
drop policy if exists inventory_staff_read on public.inventory_items;
create policy inventory_staff_read on public.inventory_items for select to authenticated
using (public.has_any_role(array['admin','finance','production_manager','print_operator','laser_operator']::public.app_role[]));
drop policy if exists inventory_manage on public.inventory_items;
create policy inventory_manage on public.inventory_items for all to authenticated
using (public.has_any_role(array['admin','finance','production_manager']::public.app_role[]))
with check (public.has_any_role(array['admin','finance','production_manager']::public.app_role[]));
drop policy if exists inventory_movements_staff on public.inventory_movements;
create policy inventory_movements_staff on public.inventory_movements for all to authenticated
using (public.has_any_role(array['admin','finance','production_manager','print_operator','laser_operator']::public.app_role[]))
with check (public.has_any_role(array['admin','finance','production_manager','print_operator','laser_operator']::public.app_role[]));
drop policy if exists expenses_finance_all on public.expenses;
create policy expenses_finance_all on public.expenses for all to authenticated
using (public.has_any_role(array['admin','finance']::public.app_role[]))
with check (public.has_any_role(array['admin','finance']::public.app_role[]));
drop policy if exists invoices_finance_manage on public.invoices;
create policy invoices_finance_manage on public.invoices for all to authenticated
using (public.has_any_role(array['admin','finance']::public.app_role[]))
with check (public.has_any_role(array['admin','finance']::public.app_role[]));
drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
using (public.has_any_role(array['admin']::public.app_role[]));

-- Seed any missing built-in catalogue entries so public pages and admin edits share one source.
insert into public.services (slug,name,category,description,pricing_mode,fields,is_active,sort_order)
values
  ('website-software','Website & Software Development','Digital','Business websites, online stores, web applications, internal systems, integrations and ongoing support.','quote','[]'::jsonb,true,10),
  ('graphic-design','Graphic Design & Branding','Creative','Logo design, brand identity, business stationery, posters, brochures, packaging and campaign graphics.','quote','[]'::jsonb,true,20),
  ('banner-printing','Banner & Large-format Printing','Print','Custom banners, backdrops, roll-ups, signage and large-format promotional displays.','instant','[]'::jsonb,true,30),
  ('sticker-printing','Sticker & Label Printing','Print','Vinyl decals, product labels, transparent stickers, die-cut stickers, sheets and roll labels.','instant','[]'::jsonb,true,40),
  ('tshirt-branding','T-Shirt Branding & Apparel Printing','Branding','Branded T-shirts, polos, hoodies, sweatshirts and workwear with print or embroidery options.','quote','[]'::jsonb,true,50),
  ('mug-branding','Mug & Merchandise Branding','Branding','Branded mugs, corporate gifts, promotional merchandise and personalized items.','instant','[]'::jsonb,true,60),
  ('laser-cutting','Laser Cutting & Engraving','Fabrication','Acrylic signage, wood products, lettering, engraved gifts, decorative pieces and custom fabrication.','quote','[]'::jsonb,true,70)
on conflict (slug) do nothing;

-- Carry forward each built-in configurator into the database-backed catalogue.
update public.services set fields = '[{"name":"project_type","label":"What do you need built?","type":"select","required":true,"options":["Business website","E-commerce website","Web application","Management system / ERP","Mobile application","API or integration","Maintenance / support"]},{"name":"scope","label":"Project overview","type":"textarea","required":true},{"name":"pages_modules","label":"Estimated pages or modules","type":"number","min":1,"step":1},{"name":"integrations","label":"Required integrations","type":"text"},{"name":"timeline","label":"Preferred timeline","type":"select","options":["Flexible","2–4 weeks","1–2 months","3+ months","Urgent – discuss feasibility"]},{"name":"budget","label":"Indicative budget (KES)","type":"select","options":["Not sure yet","Below 50,000","50,000–150,000","150,000–500,000","500,000+"]}]'::jsonb where slug='website-software' and fields='[]'::jsonb;
update public.services set fields = '[{"name":"design_type","label":"Design service","type":"select","required":true,"options":["Logo design","Complete brand identity","Business cards / stationery","Flyer / poster","Brochure / company profile","Packaging design","Social media designs","Other creative work"]},{"name":"quantity","label":"Number of designs / items","type":"number","min":1,"step":1,"required":true},{"name":"brief","label":"Creative brief","type":"textarea","required":true},{"name":"formats","label":"Required final formats","type":"text"}]'::jsonb where slug='graphic-design' and fields='[]'::jsonb;
update public.services set fields = '[{"name":"material","label":"Material","type":"select","required":true,"options":["Standard frontlit banner","Premium frontlit banner","Backlit material","Mesh banner","Roll-up display material","Other / advise me"]},{"name":"width","label":"Width (metres)","type":"number","min":0.1,"step":0.01,"required":true},{"name":"height","label":"Height (metres)","type":"number","min":0.1,"step":0.01,"required":true},{"name":"quantity","label":"Quantity","type":"number","min":1,"step":1,"required":true},{"name":"sides","label":"Print sides","type":"select","options":["Single-sided","Double-sided"]},{"name":"finishing","label":"Finishing","type":"select","options":["No finishing","Hemming","Eyelets","Hemming + eyelets","Pole pockets","Advise me"]},{"name":"artwork","label":"Artwork status","type":"select","options":["Print-ready artwork available","Need design assistance"]}]'::jsonb where slug='banner-printing' and fields='[]'::jsonb;
update public.services set fields = '[{"name":"sticker_type","label":"Sticker type","type":"select","required":true,"options":["Die-cut individual stickers","Kiss-cut sheets","Rectangle labels","Transparent stickers","Roll labels","Vinyl decals"]},{"name":"material","label":"Material","type":"select","options":["White vinyl","Transparent vinyl","Paper label","Premium vinyl","Not sure"]},{"name":"width","label":"Width (cm)","type":"number","min":1,"step":0.1,"required":true},{"name":"height","label":"Height (cm)","type":"number","min":1,"step":0.1,"required":true},{"name":"quantity","label":"Quantity (pieces)","type":"number","min":1,"step":1,"required":true},{"name":"finish","label":"Finish","type":"select","options":["Gloss","Matte","Gloss laminate","Matte laminate","No preference"]},{"name":"cutting","label":"Cutting","type":"select","options":["Standard cut","Custom contour cut","Not sure"]}]'::jsonb where slug='sticker-printing' and fields='[]'::jsonb;
update public.services set fields = '[{"name":"garment_type","label":"Garment type","type":"select","required":true,"options":["T-shirt","Polo shirt","Hoodie","Sweatshirt","Workwear / uniform","Other apparel"]},{"name":"fabric","label":"Fabric preference","type":"select","required":true,"options":["Cotton","Polyester / sports fabric","Cotton-poly blend","Heavyweight fabric","Not sure — advise me"]},{"name":"garment_color","label":"Garment colour","type":"select","required":true,"options":["White","Black","Navy","Royal blue","Red","Grey","Green","Yellow","Other — specify in notes"]},{"name":"branding_method","label":"Branding method","type":"select","required":true,"options":["Screen printing","Heat transfer / DTF","Vinyl lettering","Embroidery","Not sure — advise me"]},{"name":"branding_location","label":"Branding placement","type":"select","required":true,"options":["Front chest","Full front","Back","Front and back","Sleeve","Multiple positions — specify in notes"]},{"name":"quantity","label":"Total quantity","type":"number","min":1,"step":1,"required":true},{"name":"size_breakdown","label":"Size and quantity breakdown","type":"textarea","required":true},{"name":"artwork","label":"Artwork status","type":"select","required":true,"options":["Print-ready logo / artwork available","Need design or artwork assistance","I will send the artwork later"]},{"name":"special_requirements","label":"Additional requirements","type":"textarea"}]'::jsonb where slug='tshirt-branding' and fields='[]'::jsonb;
update public.services set fields = '[{"name":"product","label":"Product","type":"select","required":true,"options":["White ceramic mug","Colour-interior mug","Magic / heat-changing mug","Travel mug","Other merchandise"]},{"name":"quantity","label":"Quantity","type":"number","min":1,"step":1,"required":true},{"name":"print_area","label":"Branding area","type":"select","options":["One side","Two sides","Full wrap (where supported)","Advise me"]},{"name":"packaging","label":"Packaging","type":"select","options":["Standard packaging","Gift box","Individual protective packaging"]},{"name":"artwork","label":"Artwork status","type":"select","options":["Print-ready artwork available","Need design assistance"]}]'::jsonb where slug='mug-branding' and fields='[]'::jsonb;
update public.services set fields = '[{"name":"process","label":"Required process","type":"select","required":true,"options":["Laser cutting","Laser engraving","Cutting + engraving"]},{"name":"material","label":"Material","type":"select","required":true,"options":["Acrylic","Plywood","MDF","Wood","Other – confirm suitability"]},{"name":"thickness","label":"Material thickness (mm)","type":"number","min":0.5,"step":0.5,"required":true},{"name":"dimensions","label":"Overall dimensions","type":"text","required":true},{"name":"quantity","label":"Quantity","type":"number","min":1,"step":1,"required":true},{"name":"notes","label":"Technical notes","type":"textarea"}]'::jsonb where slug='laser-cutting' and fields='[]'::jsonb;

-- Generic instant-priced services use quantity × unit rate + setup fee. Keep the
-- dimensional calculations for banner and sticker work and mug quantity pricing.
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
language plpgsql security definer set search_path = public
as $$
declare
  new_order public.orders%rowtype;
  item jsonb;
  cfg jsonb;
  rate_row public.pricing_rates%rowtype;
  item_slug text;
  item_qty integer;
  item_estimate numeric(14,2);
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
    item_slug := item->>'serviceSlug'; cfg := coalesce(item->'configuration','{}'::jsonb);
    item_qty := greatest(1, coalesce(nullif(item->>'quantity','')::integer,1)); item_estimate := null;
    if not exists(select 1 from public.services s where s.slug=item_slug and s.is_active=true) then raise exception 'The selected service is not available'; end if;
    select * into rate_row from public.pricing_rates pr where pr.service_slug=item_slug and pr.active=true and pr.unit_rate > 0 for share;
    if found then
      if item_slug = 'banner-printing' then
        v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
        if v_width > 0 and v_height > 0 then item_estimate := round((v_width*v_height*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
      elsif item_slug = 'sticker-printing' then
        v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
        if v_width > 0 and v_height > 0 then item_estimate := round(((v_width*v_height/100)*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
      else
        item_estimate := round((item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2);
      end if;
    end if;
    if item_estimate is null then has_unpriced := true; else estimate_total := estimate_total+item_estimate; end if;
  end loop;

  insert into public.orders (reference,customer_id,customer_name,customer_email,customer_phone,payment_method,delivery_method,delivery_address,delivery_instructions,status,payment_status,customer_notes,subtotal,total)
  values (p_reference,auth.uid(),p_customer_name,p_customer_email,p_customer_phone,p_payment_method,p_delivery_method,nullif(trim(p_delivery_address),''),p_delivery_instructions,'awaiting_review','unpaid',p_customer_notes,case when has_unpriced then null else estimate_total end,case when has_unpriced then null else estimate_total end)
  returning * into new_order;

  for item in select value from jsonb_array_elements(p_items) loop
    item_slug := item->>'serviceSlug'; cfg := coalesce(item->'configuration','{}'::jsonb);
    item_qty := greatest(1,coalesce(nullif(item->>'quantity','')::integer,1)); item_estimate := null;
    select * into rate_row from public.pricing_rates pr where pr.service_slug=item_slug and pr.active=true and pr.unit_rate>0 for share;
    if found then
      if item_slug='banner-printing' then
        v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
        if v_width>0 and v_height>0 then item_estimate := round((v_width*v_height*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
      elsif item_slug='sticker-printing' then
        v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
        if v_width>0 and v_height>0 then item_estimate := round(((v_width*v_height/100)*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
      else item_estimate := round((item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2);
      end if;
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
