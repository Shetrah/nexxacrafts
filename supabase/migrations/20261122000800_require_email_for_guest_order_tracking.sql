-- Guest order tracking requires both the reference and checkout email.
-- The RPC intentionally returns progress-only fields and no customer PII/files.
drop function if exists public.track_order(text);
drop function if exists public.track_order(text, text);

create function public.track_order(p_reference text, p_email text)
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
set search_path = pg_catalog, public, pg_temp
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
    and nullif(trim(p_email), '') is not null
    and o.reference = upper(trim(p_reference))
    and lower(o.customer_email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
