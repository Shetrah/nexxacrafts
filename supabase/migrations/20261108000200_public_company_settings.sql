-- Expose only customer-facing company settings to the public website.
-- The company_settings table remains staff-only; future/internal keys are never returned here.
create or replace function public.get_public_company_settings()
returns table(setting_key text, setting_value jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select cs.setting_key, cs.setting_value
  from public.company_settings cs
  where cs.setting_key = any (array[
    'business_name',
    'tagline',
    'public_email',
    'phone',
    'location',
    'website',
    'currency',
    'quote_validity_days',
    'mpesa_instructions',
    'bank_instructions',
    'payment_notes'
  ]::text[]);
$$;

revoke all on function public.get_public_company_settings() from public;
grant execute on function public.get_public_company_settings() to anon, authenticated;
