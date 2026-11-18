-- Keep the email address entered for the order. The previous trigger replaced it with
-- the signed-in account email, which could direct invoices to staff/account mailboxes.
create or replace function public.set_order_customer_email_from_auth()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.customer_email := lower(trim(coalesce(new.customer_email, '')));
  if new.customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid customer email address';
  end if;
  return new;
end;
$$;

-- Customer contact records are kept separately from auth accounts so staff can record
-- individuals and company clients without creating passwords or login credentials.
create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  company_name text,
  email text not null,
  phone text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_contacts_email_valid check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);
alter table public.client_contacts enable row level security;
drop policy if exists client_contacts_admin_access on public.client_contacts;
create policy client_contacts_admin_access on public.client_contacts for all to authenticated
  using (public.has_any_role(array['admin','sales','finance']::public.app_role[]))
  with check (public.has_any_role(array['admin','sales','finance']::public.app_role[]));
