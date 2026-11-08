/**
 * Pricing rates (`public.pricing_rates`): the single existing implementations in
 * `src/lib/pricing.ts`, re-exported so pages can import all data access from `@/lib/api`.
 *
 * - `loadPricingRates()` — public read of active rates; super_admin, admin and sales also read
 *   inactive rates. Falls back to browser-stored rates when Supabase is not configured.
 * - `savePricingRate(rate)` — upsert on `service_slug`. Access (RLS): super_admin, admin, sales.
 * - `calculateEstimate(slug, configuration, rates)` — the browser-side estimate (the order RPC
 *   recalculates on the server).
 */
export { calculateEstimate, loadPricingRates, savePricingRate } from '@/lib/pricing';
export type { PricingRate } from '@/lib/pricing';
