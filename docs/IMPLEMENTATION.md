# nexxacrafts implementation and handover notes

## Decisions applied

- Brand display name: **nexxacrafts**
- Admin access: role-based staff accounts, including a first `super_admin`
- Pricing: hybrid (configured instant estimates for standard jobs; reviewed quotes for complex work)
- Preferred payment methods: M-Pesa, bank transfer and card
- Existing project retained: React + TypeScript + Vite + Tailwind + Supabase

## What changed in this upgrade

1. Reworked the application shell and public storefront while retaining existing About, Portfolio and Contact page components.
2. Added service definitions and guided configurators for website/software development, graphic design, banners, stickers, mug branding and laser cutting.
3. Added local cart, quote request form, checkout request flow (M-Pesa/bank/card preference plus collection, local delivery or courier selection) and customer account UI.
4. Added Supabase authentication/profile integration and a staff portal at `/admin`.
5. Added staff order and quotation status workspaces, active pricing-rate management, staff role administration, expense capture, initial stock/project screens and editable company/payment display settings.
6. Added a Supabase schema/security migration for orders, quotes, rates, payments, production, proof reviews, inventory, expenses, invoices, projects, tasks, notifications, audit logs and private customer file storage.
7. Added setup and operational documentation.

## Immediate setup dependencies

The ZIP did not include a `.env` file or credentials, so the project cannot connect to the real Supabase project until nexxacrafts supplies those values. Do not commit `.env` to version control.

The first user created through `/account` receives the `customer` role. Promote the owner to `super_admin` using the SQL in the root README. Then create staff accounts and assign only the required role to each person.

## Remaining engineering work before production

- Implement authenticated customer file upload to private storage and add upload metadata to quote requests; current service configurators upload authenticated files when Supabase is connected, while browser-only preview records filenames only.
- Complete inventory movement/consumption tracking, proof approval, invoice issuance, payment reconciliation, project tasks/milestones, dispatch controls and public use of stored company settings.
- Implement a transaction-safe payment service for M-Pesa STK Push, card provider checkout, bank transfer verification, callbacks, refunds and reconciliation.
- Add a customer order detail page with order-item detail, messages, proof previews and delivery tracking.
- Add server-side notifications (email/SMS) and audit events for critical actions.
- Validate uploaded files by inspecting actual file signatures, not relying solely on browser MIME types/extensions. Add malware scanning if supported by hosting infrastructure.
- Confirm product/service copy, exact pricing, supported print media, laser machine work envelope/material constraints and production lead-time rules.
- Add tests (pricing calculations, RLS role matrix, checkout RPC, quote conversion, payment webhook verification) and run a full staging UAT.

## Build validation

The environment used to prepare this source update did not complete `npm ci` within the available command window, so a fresh Vite production build could not be verified here. Run `npm ci`, `npm run build` and `npm run lint` in the target development environment after installing dependencies. Resolve any TypeScript/lint errors before deployment.
