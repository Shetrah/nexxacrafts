# nexxacrafts platform

nexxacrafts is a React + TypeScript + Vite application for a combined digital-services, creative, print, branding and laser-cutting business. It includes a public storefront, configurable service ordering, quote requests, cart/checkout request flow, customer account screens and a role-aware staff administration portal.

## Stack

- React 18, TypeScript and Vite
- Tailwind CSS
- Supabase Auth, PostgreSQL, Row Level Security and private Storage
- React Router

## Run locally

```bash
npm install
cp .env.example .env
# Add the Supabase project URL and anon/publishable key to .env
npm run dev
```

The public site can be previewed without Supabase. In that mode, quote/order submissions are saved in the current browser only, and selected upload filenames are demonstrative metadata rather than uploaded file content. Customer accounts, shared records, secure uploads and staff authentication require Supabase.

## Supabase setup

1. Create a Supabase project.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` or the hosting provider's environment settings.
3. Apply migrations in timestamp order from `supabase/migrations/` using the Supabase CLI or SQL editor.
4. Enable email/password authentication. Configure email confirmation and password recovery URLs for your deployed domain.
5. Create the owner account using `/account`.
6. In the Supabase SQL editor, promote that account to the first super administrator:

```sql
update public.profiles
set role = 'super_admin'
where id = (select id from auth.users where email = 'OWNER_EMAIL_HERE');
```

7. Sign in at `/admin`. Create staff accounts from the normal account registration flow and assign their roles from Admin → Staff & roles. Only a super administrator can change roles.
8. Configure the actual unit rates under Admin → Pricing rules. No sale prices are hardcoded because nexxacrafts's approved price list has not yet been provided.

## Current implementation scope

- Public pages: home, service catalogue, configurators, custom quote form, cart, checkout request, portfolio, about, contact and customer account.
- Service configurators: website/software, graphic design, banners, stickers, mugs and laser cutting.
- Hybrid pricing: instant-estimate calculation for banner, sticker and mug jobs when an administrator activates a rate; quote-led flow for software, graphic design and laser cutting. Checkout captures collection, local delivery or courier preferences and address instructions.
- Secure admin sign-in with role-based navigation.
- Initial staff tools: order status progression, quotation status and amount management, editable service rates, role assignment, production job queues/status updates, inventory item creation, expense entry, project creation/listing and editable company/payment-display settings.
- Database foundation for services, rates, quotes, orders, line items, payments, production jobs, proof reviews, inventory, expenses, invoices, projects, tasks, notifications and audit logs.
- Private customer-file storage bucket with RLS policies. Live uploads require an authenticated customer and a configured Supabase project.

Production, inventory, finance and projects have useful first-pass operational screens, but they are not yet complete ERP modules. Stock movement/consumption, full invoice issuance, payment reconciliation, proof approvals, project task management, dispatch and notification automations remain to be completed.

## Payments: important readiness note

Checkout currently records the customer's preferred payment method (M-Pesa, bank transfer or card) plus collection/local-delivery/courier details, and creates a pending payment record after an authenticated order is submitted. It does **not** collect money yet. Live M-Pesa STK Push, card checkout, bank reconciliation, payment callbacks/webhooks, signature verification, refunds and reconciliation must be implemented through server-side Supabase Edge Functions or a trusted backend. Provider secrets must never be exposed in frontend `VITE_*` variables.

Before production launch, choose the specific payment providers and obtain their merchant credentials, callback URLs and test accounts. Verify each provider's webhook signature server-side before changing a payment to confirmed.

## Pricing notes

Rates are deliberately inactive/empty by default. For the three instant-configuration services, configure the service rate and setup fee in Admin → Pricing rules. Banner rate is per square metre; sticker rate is currently interpreted per 100 cm²; mug rate is per piece. Confirm the correct unit and commercial rate with the production team before enabling rates. All automatic totals are estimates until reviewed and confirmed.

## Production launch checklist

- Replace placeholder/generic stock imagery with nexxacrafts-owned portfolio and product photography.
- The primary site wordmark and new SVG brand mark use the approved spelling “nexxacrafts”. The original supplied PNG logo is preserved in `public/` but is no longer used in the primary navigation.
- Supply real price lists, minimum charges, quantity breaks, rush rules and supported machine/material constraints.
- Complete payment-provider Edge Functions and webhook verification.
- Finish production, proof approval, inventory, expense, invoice, project and delivery CRUD screens.
- Add email/SMS notification providers and templates.
- Configure domain, HTTPS, backups, database monitoring and storage retention.
- Run end-to-end tests with test customers and staff roles before accepting live orders.
# nexxacraftss
