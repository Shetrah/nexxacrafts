-- Require customer-owned quote records from this deployment onward.
-- Legacy guest quotes are retained; link those with an exact matching customer account.
update public.quote_requests q
set customer_id = matches.id
from (
  select lower(u.email) as normalized_email, min(u.id::text)::uuid as id
  from auth.users u
  join public.profiles p on p.id = u.id and p.role = 'customer'
  where u.email is not null
  group by lower(u.email)
  having count(*) = 1
) as matches
where q.customer_id is null
  and lower(trim(q.email)) = matches.normalized_email;

-- Remove anonymous access. Authenticated direct inserts must belong to the
-- signed-in customer and use that account's email; contact-email also enforces
-- these checks server-side before using its service role to insert the record.
drop policy if exists quote_insert_public on public.quote_requests;
drop policy if exists quote_insert_registered_client on public.quote_requests;
create policy quote_insert_registered_client on public.quote_requests
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and lower(trim(email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and public.has_any_role(array['customer']::public.app_role[])
  );

revoke insert on public.quote_requests from anon;
grant insert on public.quote_requests to authenticated;

comment on column public.quote_requests.customer_id is
  'Registered client account that owns the quotation; new public requests require an authenticated customer.';
