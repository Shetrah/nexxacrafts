-- Keep customer identity in auth.users and copy optional profile metadata into public.profiles.
-- The confirmation email itself is sent by Supabase Auth through the configured SMTP provider.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, company, role)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'phone'), ''),
    nullif(btrim(new.raw_user_meta_data->>'company'), ''),
    'customer'
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    company = coalesce(public.profiles.company, excluded.company);
  return new;
end;
$$;

-- Backfill existing customer records from auth metadata without overwriting profile edits.
update public.profiles p
set full_name = coalesce(p.full_name, nullif(btrim(u.raw_user_meta_data->>'full_name'), '')),
    phone = coalesce(p.phone, nullif(btrim(u.raw_user_meta_data->>'phone'), '')),
    company = coalesce(p.company, nullif(btrim(u.raw_user_meta_data->>'company'), ''))
from auth.users u
where p.id = u.id and p.role = 'customer';
