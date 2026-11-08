-- nexxacrafts platform foundation
-- Apply after the existing contact_inquiries migration.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum (
    'super_admin','admin','sales','finance','designer','print_operator',
    'laser_operator','developer','production_manager','dispatch','customer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pricing_mode as enum ('instant','quote');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  company text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.has_any_role(allowed public.app_role[])
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_app_role() = any(allowed), false) $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_nexxacrafts on auth.users;
create trigger on_auth_user_created_nexxacrafts
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- The profile owner may edit contact details, but only a super admin may change roles.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.role is distinct from new.role and current_user not in ('postgres','service_role') and not public.has_any_role(array['super_admin']::public.app_role[]) then
    raise exception 'Only a super administrator can change staff roles';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger before update on public.profiles
for each row execute procedure public.protect_profile_role();

create table if not exists public.services (
  slug text primary key,
  name text not null,
  category text not null,
  description text not null default '',
  pricing_mode public.pricing_mode not null default 'quote',
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.services (slug,name,category,description,pricing_mode,sort_order) values
('website-software','Website & Software Development','Digital','Business websites, online stores, web applications, internal systems and integrations.','quote',1),
('graphic-design','Graphic Design & Branding','Creative','Logo design, brand identity, stationery, posters, brochures and packaging.','quote',2),
('banner-printing','Banner & Large-format Printing','Print','Custom banners, backdrops, roll-ups, signage and promotional displays.','instant',3),
('sticker-printing','Sticker & Label Printing','Print','Vinyl decals, product labels, transparent stickers, die-cut stickers and sheets.','instant',4),
('mug-branding','Mug & Merchandise Branding','Branding','Branded mugs, corporate gifts and promotional merchandise.','instant',5),
('laser-cutting','Laser Cutting & Engraving','Fabrication','Acrylic signage, wood products, lettering and custom fabrication.','quote',6)
on conflict (slug) do update set name=excluded.name,category=excluded.category,description=excluded.description,pricing_mode=excluded.pricing_mode,sort_order=excluded.sort_order,updated_at=now();

create table if not exists public.pricing_rates (
  service_slug text primary key references public.services(slug) on delete cascade,
  unit_rate numeric(14,2) not null default 0 check (unit_rate >= 0),
  setup_fee numeric(14,2) not null default 0 check (setup_fee >= 0),
  unit_label text not null default 'unit',
  active boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  email text not null,
  phone text,
  company text,
  service_slug text not null,
  description text not null,
  configuration jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted','under_review','need_information','quoted','accepted','declined','converted')),
  quoted_amount numeric(14,2),
  currency text not null default 'KES',
  assigned_to uuid references auth.users(id) on delete set null,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  payment_method text not null check (payment_method in ('mpesa','bank','card')),
  delivery_method text not null default 'collection' check (delivery_method in ('collection','local_delivery','courier')),
  delivery_address text,
  delivery_instructions text,
  status text not null default 'awaiting_review' check (status in ('submitted','awaiting_review','awaiting_payment','artwork_pending','awaiting_approval','in_production','quality_check','ready_for_dispatch','dispatched','completed','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','partially_paid','paid','refunded','failed')),
  customer_notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  subtotal numeric(14,2),
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2),
  currency text not null default 'KES',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_slug text not null,
  service_name text not null,
  configuration jsonb not null default '{}'::jsonb,
  quantity integer not null default 1 check (quantity > 0),
  estimated_amount numeric(14,2),
  confirmed_amount numeric(14,2),
  files text[] not null default '{}',
  production_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('mpesa','bank','card')),
  amount numeric(14,2),
  currency text not null default 'KES',
  status text not null default 'pending' check (status in ('pending','initiated','confirmed','failed','refunded','reconciled')),
  provider text,
  provider_reference text,
  transaction_reference text,
  recorded_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  department text not null check (department in ('design','printing','mug_branding','laser','software','dispatch')),
  status text not null default 'queued',
  assigned_to uuid references auth.users(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Automatically create a department production job for every submitted order line.
create or replace function public.create_production_job_for_order_item()
returns trigger language plpgsql security definer set search_path = public
as $$
declare dept text;
begin
  dept := case new.service_slug
    when 'website-software' then 'software'
    when 'graphic-design' then 'design'
    when 'banner-printing' then 'printing'
    when 'sticker-printing' then 'printing'
    when 'mug-branding' then 'mug_branding'
    when 'laser-cutting' then 'laser'
    else 'dispatch'
  end;
  insert into public.production_jobs(order_item_id,department,status,priority)
  values(new.id,dept,'queued','normal');
  return new;
end;
$$;
drop trigger if exists create_production_job_after_order_item on public.order_items;
create trigger create_production_job_after_order_item
after insert on public.order_items for each row
execute procedure public.create_production_job_for_order_item();

create table if not exists public.proof_reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  version integer not null default 1,
  file_path text not null,
  status text not null default 'awaiting_customer' check (status in ('awaiting_customer','approved','revision_requested')),
  customer_comment text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_item_id, version)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  category text,
  unit text not null default 'piece',
  quantity_on_hand numeric(14,3) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  average_cost numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('receipt','usage','adjustment','return','waste')),
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2),
  order_id uuid references public.orders(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_account text,
  reference text,
  attachment_path text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  invoice_number text not null unique,
  customer_name text not null,
  customer_email text,
  subtotal numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','issued','partially_paid','paid','void')),
  due_date date,
  issued_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  name text not null,
  project_type text not null default 'software',
  description text,
  status text not null default 'planning',
  start_date date,
  due_date date,
  budget numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','review','done','blocked')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  setting_key text primary key,
  setting_value jsonb not null default '""'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for the most common operational views.
create index if not exists idx_orders_customer_created on public.orders(customer_id, created_at desc);
create index if not exists idx_orders_status_created on public.orders(status, created_at desc);
create index if not exists idx_quotes_status_created on public.quote_requests(status, created_at desc);
create index if not exists idx_production_jobs_status on public.production_jobs(status, due_at);
create index if not exists idx_payments_order on public.payments(order_id, created_at desc);
create index if not exists idx_tasks_assigned on public.project_tasks(assigned_to, status, due_at);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- Updated-at helper.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end; $$;
do $$ declare tbl text; begin
  foreach tbl in array array['services','orders','quote_requests','production_jobs','inventory_items','projects','project_tasks','company_settings'] loop
    execute format('drop trigger if exists set_updated_at_%I on public.%I',tbl,tbl);
    execute format('create trigger set_updated_at_%I before update on public.%I for each row execute procedure public.set_updated_at()',tbl,tbl);
  end loop;
end $$;

-- Enable row level security.
do $$ declare tbl text; begin
  foreach tbl in array array['profiles','services','pricing_rates','quote_requests','orders','order_items','payments','production_jobs','proof_reviews','inventory_items','inventory_movements','expenses','invoices','projects','project_tasks','company_settings','notifications','audit_logs'] loop
    execute format('alter table public.%I enable row level security',tbl);
  end loop;
end $$;

-- Profiles: each user can see/edit their own contact profile; staff can see profiles.
drop policy if exists profiles_select_self_or_staff on public.profiles;
create policy profiles_select_self_or_staff on public.profiles for select to authenticated
using (id = auth.uid() or public.has_any_role(array['super_admin','admin','sales','finance','production_manager']::public.app_role[]));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() or public.has_any_role(array['super_admin']::public.app_role[]))
with check (id = auth.uid() or public.has_any_role(array['super_admin']::public.app_role[]));

-- Service catalogue and rates are public-read; protected staff roles manage them.
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services for select to anon, authenticated using (is_active or public.has_any_role(array['super_admin','admin']::public.app_role[]));
drop policy if exists services_admin_manage on public.services;
create policy services_admin_manage on public.services for all to authenticated
using (public.has_any_role(array['super_admin','admin']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin']::public.app_role[]));
drop policy if exists pricing_public_read on public.pricing_rates;
create policy pricing_public_read on public.pricing_rates for select to anon, authenticated using (active or public.has_any_role(array['super_admin','admin','sales']::public.app_role[]));
drop policy if exists pricing_manage on public.pricing_rates;
create policy pricing_manage on public.pricing_rates for all to authenticated
using (public.has_any_role(array['super_admin','admin','sales']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','sales']::public.app_role[]));

-- Public quote submission; customers can later view their own linked requests; relevant staff manage requests.
drop policy if exists quote_insert_public on public.quote_requests;
create policy quote_insert_public on public.quote_requests for insert to anon, authenticated with check (customer_id is null or customer_id = auth.uid());
drop policy if exists quote_select_owner_or_staff on public.quote_requests;
create policy quote_select_owner_or_staff on public.quote_requests for select to authenticated
using (customer_id = auth.uid() or public.has_any_role(array['super_admin','admin','sales','finance']::public.app_role[]));
drop policy if exists quote_update_staff on public.quote_requests;
create policy quote_update_staff on public.quote_requests for update to authenticated
using (public.has_any_role(array['super_admin','admin','sales']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','sales']::public.app_role[]));

-- Orders: customers create and view their own orders. Operational staff update according to role.
drop policy if exists orders_select_owner_or_staff on public.orders;
create policy orders_select_owner_or_staff on public.orders for select to authenticated
using (customer_id = auth.uid() or public.has_any_role(array['super_admin','admin','sales','finance','designer','print_operator','laser_operator','developer','production_manager','dispatch']::public.app_role[]));
-- Customer orders are created only through create_customer_order(), which validates the session and writes the order atomically.
drop policy if exists orders_insert_owner on public.orders;
drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders for update to authenticated
using (public.has_any_role(array['super_admin','admin','sales','finance','production_manager','dispatch']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','sales','finance','production_manager','dispatch']::public.app_role[]));

-- Order line access is inherited through ownership of the parent order or staff role.
drop policy if exists order_items_select_owner_or_staff on public.order_items;
create policy order_items_select_owner_or_staff on public.order_items for select to authenticated using (
  exists(select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()) or public.has_any_role(array['super_admin','admin','sales','finance','designer','print_operator','laser_operator','developer','production_manager','dispatch']::public.app_role[])
);
-- Order lines are created only by the validated order RPC.
drop policy if exists order_items_insert_owner on public.order_items;
drop policy if exists order_items_update_staff on public.order_items;
create policy order_items_update_staff on public.order_items for update to authenticated using (
  public.has_any_role(array['super_admin','admin','sales','designer','print_operator','laser_operator','developer','production_manager']::public.app_role[])
) with check (
  public.has_any_role(array['super_admin','admin','sales','designer','print_operator','laser_operator','developer','production_manager']::public.app_role[])
);

-- Payments are created with an order and managed by finance/admin; customers can read their own.
drop policy if exists payments_select_owner_or_staff on public.payments;
create policy payments_select_owner_or_staff on public.payments for select to authenticated using (
  exists(select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()) or public.has_any_role(array['super_admin','admin','finance','sales']::public.app_role[])
);
-- Customers cannot directly insert payment rows or mark payments paid. The order RPC creates a pending payment row; trusted server-side provider callbacks confirm receipts.
drop policy if exists payments_insert_owner on public.payments;
drop policy if exists payments_update_finance on public.payments;
create policy payments_update_finance on public.payments for update to authenticated
using (public.has_any_role(array['super_admin','admin','finance']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','finance']::public.app_role[]));

-- Operational tables: staff-only, with department access. Customer proof approval is exposed through a narrow update policy.
drop policy if exists production_staff_all on public.production_jobs;
create policy production_staff_all on public.production_jobs for all to authenticated
using (public.has_any_role(array['super_admin','admin','production_manager','designer','print_operator','laser_operator','developer','dispatch']::public.app_role[]))
with check (public.has_any_role(array['super_admin','admin','production_manager','designer','print_operator','laser_operator','developer','dispatch']::public.app_role[]));
drop policy if exists proof_select_owner_or_staff on public.proof_reviews;
create policy proof_select_owner_or_staff on public.proof_reviews for select to authenticated using (
  exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and o.customer_id=auth.uid()) or public.has_any_role(array['super_admin','admin','production_manager','designer']::public.app_role[])
);
drop policy if exists proof_staff_insert on public.proof_reviews;
create policy proof_staff_insert on public.proof_reviews for insert to authenticated with check (public.has_any_role(array['super_admin','admin','production_manager','designer']::public.app_role[]));
drop policy if exists proof_update_customer_or_staff on public.proof_reviews;
create policy proof_update_customer_or_staff on public.proof_reviews for update to authenticated using (
  exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and o.customer_id=auth.uid()) or public.has_any_role(array['super_admin','admin','production_manager','designer']::public.app_role[])
) with check (
  exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and o.customer_id=auth.uid()) or public.has_any_role(array['super_admin','admin','production_manager','designer']::public.app_role[])
);

-- Inventory and expenses.
drop policy if exists inventory_staff_read on public.inventory_items;
create policy inventory_staff_read on public.inventory_items for select to authenticated using (public.has_any_role(array['super_admin','admin','finance','production_manager','print_operator','laser_operator']::public.app_role[]));
drop policy if exists inventory_manage on public.inventory_items;
create policy inventory_manage on public.inventory_items for all to authenticated using (public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','finance','production_manager']::public.app_role[]));
drop policy if exists inventory_movements_staff on public.inventory_movements;
create policy inventory_movements_staff on public.inventory_movements for all to authenticated using (public.has_any_role(array['super_admin','admin','finance','production_manager','print_operator','laser_operator']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','finance','production_manager','print_operator','laser_operator']::public.app_role[]));
drop policy if exists expenses_finance_all on public.expenses;
create policy expenses_finance_all on public.expenses for all to authenticated using (public.has_any_role(array['super_admin','admin','finance']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','finance']::public.app_role[]));
drop policy if exists invoices_customer_or_staff_select on public.invoices;
create policy invoices_customer_or_staff_select on public.invoices for select to authenticated using (
  (order_id is not null and exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid())) or public.has_any_role(array['super_admin','admin','finance','sales']::public.app_role[])
);
drop policy if exists invoices_finance_manage on public.invoices;
create policy invoices_finance_manage on public.invoices for all to authenticated using (public.has_any_role(array['super_admin','admin','finance']::public.app_role[])) with check (public.has_any_role(array['super_admin','admin','finance']::public.app_role[]));

-- Projects and tasks.
drop policy if exists projects_owner_or_staff on public.projects;
create policy projects_owner_or_staff on public.projects for all to authenticated using (
  customer_id=auth.uid() or public.has_any_role(array['super_admin','admin','developer','designer','production_manager']::public.app_role[])
) with check (
  customer_id=auth.uid() or public.has_any_role(array['super_admin','admin','developer','designer','production_manager']::public.app_role[])
);
drop policy if exists tasks_staff_all on public.project_tasks;
create policy tasks_staff_all on public.project_tasks for all to authenticated using (
  public.has_any_role(array['super_admin','admin','developer','designer','production_manager']::public.app_role[])
) with check (
  public.has_any_role(array['super_admin','admin','developer','designer','production_manager']::public.app_role[])
);

-- Company settings are visible only to the owner/admin team. Provider secrets belong in server-side secrets, never this table.
drop policy if exists company_settings_admin_all on public.company_settings;
create policy company_settings_admin_all on public.company_settings for all to authenticated
using (public.has_any_role(array['super_admin','admin']::public.app_role[]))
with check (public.has_any_role(array['super_admin','admin']::public.app_role[]));

-- Notifications and audit logs.
drop policy if exists notifications_owner on public.notifications;
create policy notifications_owner on public.notifications for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.has_any_role(array['super_admin','admin']::public.app_role[]));
drop policy if exists audit_logs_staff_insert on public.audit_logs;
create policy audit_logs_staff_insert on public.audit_logs for insert to authenticated with check (actor_id=auth.uid());

-- Private customer artwork bucket. Object names must start with the authenticated user's UUID.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('customer-files','customer-files',false,20971520,array[
  'image/png','image/jpeg','image/webp','application/pdf','image/svg+xml',
  'application/postscript','application/illustrator','application/dxf','application/octet-stream',
  'application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]) on conflict (id) do update set public=false,file_size_limit=20971520;
drop policy if exists customer_files_upload_own on storage.objects;
create policy customer_files_upload_own on storage.objects for insert to authenticated
with check (bucket_id='customer-files' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists customer_files_read_own_or_staff on storage.objects;
create policy customer_files_read_own_or_staff on storage.objects for select to authenticated
using (bucket_id='customer-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_any_role(array['super_admin','admin','sales','designer','print_operator','laser_operator','developer','production_manager','dispatch']::public.app_role[])));
drop policy if exists customer_files_update_own_or_staff on storage.objects;
create policy customer_files_update_own_or_staff on storage.objects for update to authenticated
using (bucket_id='customer-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_any_role(array['super_admin','admin']::public.app_role[])))
with check (bucket_id='customer-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_any_role(array['super_admin','admin']::public.app_role[])));
drop policy if exists customer_files_delete_own_or_staff on storage.objects;
create policy customer_files_delete_own_or_staff on storage.objects for delete to authenticated
using (bucket_id='customer-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_any_role(array['super_admin','admin']::public.app_role[])));

-- NOTE: Never place Supabase service-role keys or payment-provider secrets in VITE_* variables.

-- Atomically create an order, its lines and a pending payment record.
-- The server recalculates estimates from protected pricing_rates; browser totals are never trusted.
create or replace function public.create_customer_order(
  p_reference text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_payment_method text,
  p_delivery_method text,
  p_delivery_address text,
  p_delivery_instructions text,
  p_customer_notes text,
  p_items jsonb
)
returns table(id uuid, reference text)
language plpgsql security definer set search_path = public
as $$
declare
  new_order public.orders%rowtype;
  item jsonb;
  cfg jsonb;
  rate_row public.pricing_rates%rowtype;
  item_slug text;
  item_qty integer;
  item_estimate numeric(14,2);
  estimate_total numeric(14,2) := 0;
  has_unpriced boolean := false;
  v_width numeric;
  v_height numeric;
begin
  if auth.uid() is null then raise exception 'Sign in is required to place an order'; end if;
  if nullif(trim(p_customer_name),'') is null or nullif(trim(p_customer_email),'') is null or nullif(trim(p_customer_phone),'') is null then
    raise exception 'Customer name, email and phone are required';
  end if;
  if p_payment_method is null or p_payment_method not in ('mpesa','bank','card') then raise exception 'Unsupported payment method'; end if;
  if p_delivery_method is null or p_delivery_method not in ('collection','local_delivery','courier') then raise exception 'Unsupported delivery method'; end if;
  if p_delivery_method in ('local_delivery','courier') and nullif(trim(p_delivery_address),'') is null then raise exception 'A delivery address is required'; end if;
  if coalesce(jsonb_typeof(p_items),'') <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one order item is required'; end if;

  for item in select value from jsonb_array_elements(p_items) loop
    item_slug := item->>'serviceSlug';
    cfg := coalesce(item->'configuration','{}'::jsonb);
    item_qty := greatest(1, coalesce(nullif(item->>'quantity','')::integer,1));
    item_estimate := null;

    if not exists(select 1 from public.services s where s.slug=item_slug and s.is_active=true) then
      raise exception 'The selected service is not available';
    end if;

    select * into rate_row from public.pricing_rates pr
      where pr.service_slug=item_slug and pr.active=true and pr.unit_rate > 0 for share;

    if found then
      if item_slug = 'banner-printing' then
        v_width := nullif(cfg->>'width','')::numeric;
        v_height := nullif(cfg->>'height','')::numeric;
        if v_width > 0 and v_height > 0 then
          item_estimate := round((v_width * v_height * item_qty * rate_row.unit_rate + rate_row.setup_fee)::numeric,2);
        end if;
      elsif item_slug = 'sticker-printing' then
        v_width := nullif(cfg->>'width','')::numeric;
        v_height := nullif(cfg->>'height','')::numeric;
        if v_width > 0 and v_height > 0 then
          item_estimate := round(((v_width * v_height / 100) * item_qty * rate_row.unit_rate + rate_row.setup_fee)::numeric,2);
        end if;
      elsif item_slug = 'mug-branding' then
        item_estimate := round((item_qty * rate_row.unit_rate + rate_row.setup_fee)::numeric,2);
      end if;
    end if;

    if item_estimate is null then has_unpriced := true;
    else estimate_total := estimate_total + item_estimate;
    end if;
  end loop;

  insert into public.orders (
    reference, customer_id, customer_name, customer_email, customer_phone,
    payment_method, delivery_method, delivery_address, delivery_instructions, status, payment_status, customer_notes, subtotal, total
  ) values (
    p_reference, auth.uid(), p_customer_name, p_customer_email, p_customer_phone,
    p_payment_method, p_delivery_method, nullif(trim(p_delivery_address),''), p_delivery_instructions, 'awaiting_review', 'unpaid', p_customer_notes,
    case when has_unpriced then null else estimate_total end,
    case when has_unpriced then null else estimate_total end
  ) returning * into new_order;

  -- Create the order lines after the order row exists.
  for item in select value from jsonb_array_elements(p_items) loop
    item_slug := item->>'serviceSlug';
    cfg := coalesce(item->'configuration','{}'::jsonb);
    item_qty := greatest(1, coalesce(nullif(item->>'quantity','')::integer,1));
    item_estimate := null;
    select * into rate_row from public.pricing_rates pr where pr.service_slug=item_slug and pr.active=true and pr.unit_rate > 0 for share;
    if found then
      if item_slug='banner-printing' then
        v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
        if v_width > 0 and v_height > 0 then item_estimate := round((v_width*v_height*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
      elsif item_slug='sticker-printing' then
        v_width := nullif(cfg->>'width','')::numeric; v_height := nullif(cfg->>'height','')::numeric;
        if v_width > 0 and v_height > 0 then item_estimate := round(((v_width*v_height/100)*item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2); end if;
      elsif item_slug='mug-branding' then
        item_estimate := round((item_qty*rate_row.unit_rate+rate_row.setup_fee)::numeric,2);
      end if;
    end if;
    insert into public.order_items (order_id,service_slug,service_name,configuration,quantity,estimated_amount,files)
    values (new_order.id,item_slug,coalesce(item->>'serviceName',item_slug),cfg,item_qty,item_estimate,
      coalesce(array(select jsonb_array_elements_text(coalesce(item->'files','[]'::jsonb))),'{}'));
  end loop;

  insert into public.payments (order_id,method,amount,status)
  values (new_order.id,p_payment_method,case when has_unpriced then null else estimate_total end,'pending');

  return query select new_order.id,new_order.reference;
end;
$$;
revoke all on function public.create_customer_order(text,text,text,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.create_customer_order(text,text,text,text,text,text,text,text,text,jsonb) to authenticated;
