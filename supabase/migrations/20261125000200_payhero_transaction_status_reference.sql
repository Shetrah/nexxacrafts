-- Persist the PayHero-generated reference used by GET /api/v2/transaction-status.
-- provider_reference continues to hold NexxaCraft's external_reference for callbacks.
alter table public.payments
  add column if not exists payhero_reference text;

create index if not exists payments_payhero_reference_idx
  on public.payments (payhero_reference)
  where provider = 'payhero' and payhero_reference is not null;

comment on column public.payments.payhero_reference is
  'PayHero-generated transaction reference used for authenticated transaction-status polling.';
