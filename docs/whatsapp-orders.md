# Order email and WhatsApp delivery

Customer invoices and receipts are emailed through Resend from the `contact-email` Supabase Edge Function. WhatsApp messages use the Whatsy provider from the `whatsapp-messages` function and invoice delivery path. Provider credentials stay in Supabase Function secrets and are never included in browser code.

Configure these secrets for the Supabase project:

```sh
supabase secrets set RESEND_API_KEY='re_...' RESEND_FROM_EMAIL='NexxaCraft <billing@your-verified-domain.example>' RESEND_REPLY_TO='info@nexxacrafts.co.ke' WHATSAPP_API_KEY='wty_live_...' WHATSAPP_ADMIN_PHONE='2547XXXXXXXX' --project-ref mjaobluyatooabghlzdo
```

Use a sender address on a domain verified in Resend. `WHATSAPP_ADMIN_PHONE` should be the business WhatsApp recipient in international digits (for example `2547...`). The Whatsy API key must remain a Supabase secret. The app sends customer order alerts and artwork through `whatsapp-messages`; invoice delivery sends the invoice payment link using Whatsy.

Deploy updated functions after changing their source:

```sh
supabase db push --project-ref mjaobluyatooabghlzdo
supabase functions deploy contact-email --project-ref mjaobluyatooabghlzdo --no-verify-jwt
supabase functions deploy payhero-payments --project-ref mjaobluyatooabghlzdo --no-verify-jwt
supabase functions deploy whatsapp-messages --project-ref mjaobluyatooabghlzdo --no-verify-jwt
```

Invoices and payment receipts include PDF files in Resend email. WhatsApp sends the PDF with a short caption containing the amount and payment link. PDFs are stored in the private `payment-documents` bucket and shared using seven-day signed links. The payment migration records email and WhatsApp receipt acceptance separately so failed channels can be retried.

The checkout invoice request forwards the authenticated customer's session to the invoice sender, which verifies that the invoice belongs to that customer before issuing delivery. It does not use an internal shared-secret header.
