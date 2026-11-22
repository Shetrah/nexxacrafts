# Supabase Auth email with Resend

The account page supports signup confirmation, resending a confirmation link, password recovery, and setting a new password. Supabase Auth sends all of those messages through the SMTP provider configured for the Supabase project; the website does not call Resend directly and no Resend key belongs in `VITE_*` variables.

## Configure delivery

1. Verify a sending domain you own in Resend and publish the DNS records Resend provides. Use a sender address on that verified domain, such as `accounts@your-domain.example`. Do not use a `@gmail.com` address as the sender; Resend will reject it because you cannot verify Gmail's domain.
2. In the Supabase dashboard, open **Authentication → Settings → SMTP Settings** (or the project's Resend integration) and enable custom SMTP.
3. For manual Resend SMTP setup, use:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: a Resend API key with permission to send from the verified domain
   - Sender email: the verified address from step 1
   - Sender name: `nexxacrafts`
4. In **Authentication → URL Configuration**, set **Site URL** to `https://nexxacrafts.co.ke`. Add `https://nexxacrafts.co.ke/account?confirmed=1` and `https://nexxacrafts.co.ke/account?mode=reset` to the redirect allow-list. For local development, allow-list the exact local callback separately; do not set localhost as the Site URL for the production Supabase project. Supabase only permits redirects that are allow-listed and can fall back to Site URL when a requested redirect is not allowed.
5. In **Authentication → Providers → Email**, keep email confirmation enabled if new users should verify their address before signing in. Review the **Confirm signup** and **Reset password** templates and preserve Supabase's confirmation and recovery link variables.
6. Check Resend's sending logs and Supabase Auth logs after trying signup, resend confirmation, and password reset.

Keep the Resend API key only in the Supabase SMTP settings or Resend's Supabase integration. Never commit it to this repository or expose it in browser environment variables.

## What the app sends

- Signup and resend confirmation requests redirect to `https://nexxacrafts.co.ke/account?confirmed=1`. Supabase Auth processes the verification token in the callback; the account page reports success only after a confirmed Supabase session is present. Links already sent keep their original redirect destination, so resend confirmation after correcting the dashboard URL settings.
- Email address and verification status remain in Supabase Auth (`auth.users`). The database trigger stores the customer's full name, phone number and company in `public.profiles`; apply `20261117000100_customer_signup_profile.sql` to update that trigger and backfill missing profile fields.
- Password recovery redirects to `/account?mode=reset`; the account screen accepts the recovery session and lets the user set a new password.
- The sign-in screen has a **Forgot password?** flow and a **Resend confirmation email** action after registration.

Supabase project SMTP and URL settings are managed outside this source tree, so they must be configured in the dashboard for emails to reach arbitrary customer addresses. The built-in Supabase mailer is limited and intended for development; custom SMTP is needed for production delivery. A successful browser request means Supabase accepted the request; check Resend logs to confirm actual delivery.
