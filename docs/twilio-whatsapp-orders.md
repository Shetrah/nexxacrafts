# WhatsApp order notifications

Live customer orders are saved through the `create_customer_order` Supabase RPC. After a successful save, the checkout flow invokes the `contact-email` Edge Function. It emails the authenticated customer an itemized preliminary quotation through Resend and sends an order alert to the configured business WhatsApp number through Twilio. Delivery failures do not undo or duplicate a saved order.

## Configure secrets

Copy the variable names from `.env.example`, then set the real values as Supabase Edge Function secrets. Do not put Twilio credentials in `VITE_*` variables, the browser, or a committed `.env` file.

```sh
supabase secrets set TWILIO_ACCOUNT_SID=AC... TWILIO_API_KEY=SK... TWILIO_API_SECRET=... TWILIO_WHATSAPP_FROM=+14155238886 TWILIO_WHATSAPP_TO=+2547XXXXXXXX
```

For customer order emails, also configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (a sender on a verified Resend domain), and optionally `RESEND_REPLY_TO`. The sender values are Supabase Edge Function secrets and are never exposed in the website bundle.

`TWILIO_WHATSAPP_FROM` must be the WhatsApp sender enabled for your Twilio account (the sandbox sender for sandbox use). `TWILIO_WHATSAPP_TO` is the business number receiving new order alerts, in E.164 format. Both values may include the `whatsapp:` prefix or omit it.

Deploy the function after updating it:

```sh
supabase functions deploy contact-email
```

For local function development, put the secrets in `supabase/functions/.env` (ignored locally) and run:

```sh
supabase functions serve contact-email --env-file supabase/functions/.env
```

## Optional approved template

If Twilio requires an approved WhatsApp template, set `TWILIO_WHATSAPP_CONTENT_SID` to its `HX...` SID. This function sends these JSON template variables:

1. Order reference
2. Customer name
3. Customer phone
4. Item names and quantities

The template must define the matching four placeholders. If no Content SID is set, the function sends a plain text summary, suitable for an active customer service window or Twilio sandbox testing.

## Local `.env.example`

The Twilio entries there are documentation placeholders only. Supabase Edge Functions do not read the Vite app's `.env`; configure the values with `supabase secrets set` for the hosted function.

The customer message is a quotation summary using server-stored estimates. It clearly says amounts are preliminary until staff review. The app does not collect payment during checkout, so it does not issue an invoice as final or claim a receipt at order time; send an invoice after final pricing is approved and a receipt only after payment is confirmed.
