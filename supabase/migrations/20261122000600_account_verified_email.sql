-- Track the one-time post-confirmation email sent through Resend.
alter table public.profiles
  add column if not exists email_verified_notified_at timestamptz;
