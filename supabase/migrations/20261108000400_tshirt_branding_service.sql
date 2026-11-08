-- Add the T-shirt/apparel order service and send its production job to the print floor.
-- Additive: existing service data, pricing, and orders are preserved.

insert into public.services (slug, name, category, description, pricing_mode, fields, is_active, sort_order)
values (
  'tshirt-branding',
  'T-Shirt Branding & Apparel Printing',
  'Branding',
  'Branded T-shirts, polos, hoodies, sweatshirts and workwear with print or embroidery options.',
  'quote',
  '[
    {"name":"garment_type","label":"Garment type","type":"select","required":true,"options":["T-shirt","Polo shirt","Hoodie","Sweatshirt","Workwear / uniform","Other apparel"]},
    {"name":"fabric","label":"Fabric preference","type":"select","required":true,"options":["Cotton","Polyester / sports fabric","Cotton-poly blend","Heavyweight fabric","Not sure — advise me"]},
    {"name":"garment_color","label":"Garment colour","type":"select","required":true,"options":["White","Black","Navy","Royal blue","Red","Grey","Green","Yellow","Other — specify in notes"]},
    {"name":"branding_method","label":"Branding method","type":"select","required":true,"options":["Screen printing","Heat transfer / DTF","Vinyl lettering","Embroidery","Not sure — advise me"]},
    {"name":"branding_location","label":"Branding placement","type":"select","required":true,"options":["Front chest","Full front","Back","Front and back","Sleeve","Multiple positions — specify in notes"]},
    {"name":"quantity","label":"Total quantity","type":"number","min":1,"step":1,"required":true,"help":"Enter the total number of garments across all sizes."},
    {"name":"size_breakdown","label":"Size and quantity breakdown","type":"textarea","required":true,"help":"List the count for each size and make sure the total matches the quantity above. Example: S × 5, M × 10, L × 8, XL × 2."},
    {"name":"artwork","label":"Artwork status","type":"select","required":true,"options":["Print-ready logo / artwork available","Need design or artwork assistance","I will send the artwork later"]},
    {"name":"special_requirements","label":"Additional requirements","type":"textarea","help":"Mention logo colours, print size, garment brand/quality, deadline or any special instructions."}
  ]'::jsonb,
  true,
  7
)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  pricing_mode = excluded.pricing_mode,
  fields = excluded.fields,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.create_production_job_for_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dept text;
begin
  dept := case new.service_slug
    when 'website-software' then 'software'
    when 'graphic-design' then 'design'
    when 'banner-printing' then 'printing'
    when 'sticker-printing' then 'printing'
    when 'tshirt-branding' then 'printing'
    when 'mug-branding' then 'mug_branding'
    when 'laser-cutting' then 'laser'
    else 'dispatch'
  end;
  insert into public.production_jobs(order_item_id, department, status, priority)
  values (new.id, dept, 'queued', 'normal');
  return new;
end;
$$;
