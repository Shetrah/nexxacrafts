# Supabase Auth email with Resend

The account page supports signup confirmation, resending a confirmation link, password recovery, and setting a new password. Supabase Auth sends all of those messages through the SMTP provider configured for the Supabase project; the website does not call Resend directly and no Resend key belongs in `VITE_*` variables.

## Configure delivery

1. Verify a sending domain in Resend and publish the DNS records Resend provides. Use a sender address on that verified domain, such as `accounts@your-domain.example`.
2. In the Supabase dashboard, open **Authentication → Settings → SMTP Settings** (or the project's Resend integration) and enable custom SMTP.
3. For manual Resend SMTP setup, use:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: a Resend API key with permission to send from the verified domain
   - Sender email: the verified address from step 1
   - Sender name: `NexxaCraft`
4. In **Authentication → URL Configuration**, set the production Site URL and allow the account confirmation and recovery callback URLs, for example `https://your-domain.example/account` and `https://your-domain.example/account?mode=reset`. Add the local development URL too when testing (for example `http://localhost:5173/account`). Supabase only permits redirects that are allow-listed.
5. In **Authentication → Providers → Email**, keep email confirmation enabled if new users should verify their address before signing in. Review the **Confirm signup** and **Reset password** templates and preserve Supabase's confirmation and recovery link variables.
6. Check Resend's sending logs and Supabase Auth logs after trying signup, resend confirmation, and password reset.

Keep the Resend API key only in the Supabase SMTP settings or Resend's Supabase integration. Never commit it to this repository or expose it in browser environment variables.

## What the app sends

- Signup confirmation redirects to `/account?confirmed=1`.
- Password recovery redirects to `/account?mode=reset`; the account screen accepts the recovery session and lets the user set a new password.
- The sign-in screen has a **Forgot password?** flow and a **Resend confirmation email** action after registration.

Supabase project SMTP and URL settings are managed outside this source tree, so they must be configured in the dashboard for emails to reach arbitrary customer addresses. The built-in Supabase mailer is limited and intended for development; custom SMTP is needed for production delivery.
