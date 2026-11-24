-- Expose registered customer profiles (including auth email) to permitted staff only.
-- auth.users is not directly readable by the browser, so this narrowly scoped RPC is used by
-- the admin Clients page. Signup role remains hard-coded to customer in handle_new_user().
create or replace function public.admin_list_customer_profiles()
returns table (
  id uuid,
  full_name text,
  phone text,
  company text,
  email text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','sales','finance')
  ) then
    raise exception 'You are not allowed to view registered clients';
  end if;

  return query
    select p.id, p.full_name, p.phone, p.company, u.email::text, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'customer'
    order by p.created_at desc
    limit 2000;
end;
$$;

revoke all on function public.admin_list_customer_profiles() from public, anon;
grant execute on function public.admin_list_customer_profiles() to authenticated;

comment on function public.admin_list_customer_profiles() is
  'Returns registered customer profile contact data to admin, sales, and finance staff for the client directory.';
