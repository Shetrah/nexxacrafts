# Contact form email delivery

Contact form submissions are saved to `contact_inquiries` and sent to `nexxacrafts@gmail.com` by the `contact-email` Supabase Edge Function. The function uses the main website domain, `nexxacrafts.co.ke`, as the sending domain. Resend credentials are read only by the function and must never be added to frontend `VITE_*` variables.

## Configure Resend and Supabase

1. Add and verify `nexxacrafts.co.ke` in Resend, and publish the SPF/DKIM DNS records Resend provides. Use a sender address on that verified domain, such as `NexxaCraft <enquiries@nexxacrafts.co.ke>`. The function sends to `nexxacrafts@gmail.com`.
2. Set the Edge Function secrets in the Supabase project:

   ```sh
   supabase secrets set RESEND_API_KEY=re_... RESEND_FROM_EMAIL="NexxaCraft <enquiries@nexxacrafts.co.ke>" --project-ref mjaobluyatooabghlzdo
   ```

3. Deploy the function:

   ```sh
   supabase functions deploy contact-email --project-ref mjaobluyatooabghlzdo
   ```

The function allows requests from `https://nexxacrafts.vercel.app`, `https://nexxacrafts.co.ke`, and `https://www.nexxacrafts.co.ke`, plus the listed localhost development origins. Redeploy after changing the allowed origins.

The function uses Supabase's server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables to save each enquiry, then sends the notification through Resend. If email delivery is temporarily unavailable, the enquiry remains stored and the form confirms that it was received.

The success banner confirms that the enquiry was saved. A successful Resend API response means Resend accepted the email for processing, but inbox delivery is determined afterward. For a missing message, check Spam/Junk and the Resend dashboard's **Emails** activity for the message ID and its status (Delivered, Bounced, or Failed). Also confirm the `RESEND_FROM_EMAIL` sender matches the verified `nexxacrafts.co.ke` domain and that its DNS records are active. Each function invocation logs the Resend email ID and recipient; inspect Edge Function logs if the Resend dashboard has no matching message.
