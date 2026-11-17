# PayHero invoice payments

For an authenticated, fully priced order, the `contact-email` Edge Function creates one invoice, associates the existing pending payment row, and sends the invoice through Resend. The email's **Pay invoice securely** button opens `/pay/:invoiceId`. The page requests the M-Pesa phone number, while `payhero-payments` initiates the STK Push. PayHero calls the same function at `/functions/v1/payhero-payments?action=callback` after processing. A successful callback must match the stored external reference and amount before the database transaction confirms the payment, updates invoice/order balances, and creates a private email outbox row. Receipt and admin emails are sent through Resend; dashboard alerts are inserted for admin profiles. Failed email delivery can be retried from **Admin → Payments**.

Orders containing an unpriced line are saved without an invoice. Staff must set the final price and issue an invoice before the customer can pay. Payments from manual invoices without an order link are also not eligible for this gateway yet.

## Configure Supabase

1. Apply migration `20261117000500_payhero_invoice_payments.sql`.
2. Rotate/revoke any PayHero credentials previously pasted into chat or screenshots. Create a fresh API key and keep its username/password private.
3. Set Edge Function secrets (replace placeholders with the fresh rotated credentials and a sender on a verified Resend domain):

   ```sh
   supabase secrets set PAYHERO_API_USERNAME='...' PAYHERO_API_PASSWORD='...' PAYHERO_CHANNEL_ID='6751' PUBLIC_SITE_URL='https://nexxacrafts.co.ke' RESEND_API_KEY='...' RESEND_FROM_EMAIL='NexxaCraft <billing@your-verified-domain.example>' PAYMENT_ADMIN_EMAIL='nexxacrafts@gmail.com'
   ```

   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected into hosted Edge Functions by Supabase. Do not add any of these credentials to `.env`, the Vite app, or Git.

4. Deploy both updated functions:

   ```sh
   supabase functions deploy contact-email --no-verify-jwt
   supabase functions deploy payhero-payments --no-verify-jwt
   ```

5. Confirm Auth callback/redirect URLs allow `https://nexxacrafts.co.ke/pay/*` and that `PUBLIC_SITE_URL` matches the deployed site. The website must be deployed with the updated SPA route.
6. In PayHero, use the callback URL `https://mjaobluyatooabghlzdo.supabase.co/functions/v1/payhero-payments?action=callback` if configuring callbacks in the provider dashboard. The function verifies its reference, amount, and `ResultCode` against the payment row before recording success; do not treat browser redirects as proof of payment.
7. Run one low-value test payment and confirm the row, invoice balance, customer receipt, admin dashboard notification, and admin email before going live.

PayHero documents the STK Push request as `POST https://backend.payhero.co.ke/api/v2/payments` with HTTP Basic Auth, `amount`, `phone_number`, `channel_id`, `provider: "m-pesa"`, `external_reference`, and `callback_url`. Its callback includes `ExternalReference`, `Amount`, `ResultCode`, `MpesaReceiptNumber`, and `Status`; this implementation uses the provider callback and the stored order/invoice records. See [PayHero's STK Push docs](https://docs.payhero.co.ke/docs/post-initiate-mpesa-stk-push-request) and [callback format](https://docs.payhero.co.ke/docs/payment-callback).
