-- Order tracking by reference number (guest look-up).
--
-- Additive and non-destructive: creates one read-only function. No table, column or RLS policy is
-- changed. Signed-in customers already track their orders through the normal orders RLS policy; this
-- function lets someone who is NOT signed in check an order's progress by entering BOTH the order
-- reference and the email address used for the order.
--
-- It deliberately returns only progress information (status, payment status, delivery method,
-- dates, number of items and service names) — never addresses, phone numbers, amounts, notes or
-- files. Matching requires the exact reference and a case-insensitive email match, so references
-- alone cannot be enumerated.

create or replace function public.track_order(p_reference text, p_email text)
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
    and nullif(trim(p_email), '') is not null
    and o.reference = upper(trim(p_reference))
    and lower(o.customer_email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- Roll back:
-- drop function if exists public.track_order(text, text);
