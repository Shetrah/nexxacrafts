# Contact form email delivery

Contact form submissions are saved to `contact_inquiries` and sent to `nexxacrafts@gmail.com` by the `contact-email` Supabase Edge Function. Resend credentials are read only by the function and must never be added to frontend `VITE_*` variables.

## Configure Resend and Supabase

1. Verify a sending domain in Resend. Use a sender address on that verified domain, such as `NexxaCraft <enquiries@your-verified-domain>`; the recipient can remain `nexxacrafts@gmail.com`.
2. Set the Edge Function secrets in the Supabase project:

   ```sh
   supabase secrets set RESEND_API_KEY=re_... RESEND_FROM_EMAIL="NexxaCraft <enquiries@your-verified-domain>" CONTACT_TO_EMAIL=nexxacrafts@gmail.com --project-ref mjaobluyatooabghlzdo
   ```

3. Deploy the function:

   ```sh
   supabase functions deploy contact-email --project-ref mjaobluyatooabghlzdo
   ```

The function uses Supabase's server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables to save each enquiry, then sends the notification through Resend. If email delivery is temporarily unavailable, the enquiry remains stored and the form confirms that it was received.
