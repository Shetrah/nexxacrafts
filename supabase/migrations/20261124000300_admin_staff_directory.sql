-- Admin-only staff directory; unlike profiles RLS, this deliberately exposes email only
-- through a role-checked function for the staff administration screen.
create or replace function public.admin_list_staff_profiles()
returns table (
  id uuid,
  full_name text,
  phone text,
  company text,
  role text,
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
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Only an administrator can view the staff directory';
  end if;

  return query
    select p.id, p.full_name, p.phone, p.company, p.role::text, u.email::text, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role <> 'customer'
    order by p.full_name nulls last, u.email;
end;
$$;

revoke all on function public.admin_list_staff_profiles() from public, anon;
grant execute on function public.admin_list_staff_profiles() to authenticated;

comment on function public.admin_list_staff_profiles() is
  'Returns staff profile and email details only to administrators.';
