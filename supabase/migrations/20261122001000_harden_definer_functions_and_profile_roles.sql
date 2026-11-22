-- Harden SECURITY DEFINER function lookup paths and close role self-promotion.
-- pg_temp is explicit and last so temporary objects cannot shadow trusted names.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'alter function %s set search_path = pg_catalog, public, pg_temp',
      fn.signature
    );
  end loop;
end;
$$;

-- Client code uses existing objects only; it must not be able to create
-- attacker-controlled functions or operators in the trusted public schema.
revoke create on schema public from public, anon, authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if old.role is distinct from new.role
    and auth.uid() is not null
    and coalesce(auth.role(), '') <> 'service_role'
    and not public.has_any_role(array['admin']::public.app_role[])
  then
    raise exception 'Only an administrator can change staff roles';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
