-- Replace guest order lookup with a reference-only version.
-- Keep the response limited to progress fields; never return customer contact details,
-- addresses, financial amounts, private notes or files.
drop function if exists public.track_order(text, text);

create or replace function public.track_order(p_reference text)
returns table(
  reference text,
  status text,
  payment_status text,
  delivery_method text,
  created_at timestamptz,
  updated_at timestamptz,
  item_count integer,
  services text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.reference,
    o.status,
    o.payment_status,
    o.delivery_method,
    o.created_at,
    o.updated_at,
    (select count(*)::integer from public.order_items oi where oi.order_id = o.id),
    coalesce((select array_agg(distinct oi.service_name) from public.order_items oi where oi.order_id = o.id), '{}'::text[])
  from public.orders o
  where nullif(trim(p_reference), '') is not null
    and o.reference = upper(trim(p_reference))
  limit 1;
$$;

revoke all on function public.track_order(text) from public;
grant execute on function public.track_order(text) to anon, authenticated;

-- Roll back:
-- drop function if exists public.track_order(text);
