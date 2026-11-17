-- Never let a browser supply a different recipient for an authenticated customer's order.
create or replace function public.set_order_customer_email_from_auth()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
    select lower(u.email) into new.customer_email
    from auth.users u
    where u.id = auth.uid();
  end if;
  if new.customer_email is null then
    raise exception 'The signed-in account must have an email address';
  end if;
  return new;
end;
$$;

drop trigger if exists set_order_customer_email_from_auth on public.orders;
create trigger set_order_customer_email_from_auth
before insert on public.orders
for each row execute procedure public.set_order_customer_email_from_auth();
