/**
 * Typed data-access layer for NexxaCraft. Import everything from `@/lib/api`.
 *
 * - Every function throws `Error('Supabase is not configured for this environment.')` when the
 *   Supabase environment variables are missing (the re-exported `src/lib/platform.ts` and
 *   `src/lib/pricing.ts` functions keep their browser demo fallbacks instead).
 * - Failed queries throw an `Error` (an `ApiError` for database errors); display it with
 *   `toErrorMessage(err)`.
 * - Updates return the updated row and throw (`isPermissionError(err) === true`) when nothing was
 *   updated, because row-level security blocks updates silently.
 * - Row types live in `@/types/db`; status vocabulary in `@/lib/status`; roles in `@/lib/roles`.
 */
export { isSupabaseConfigured } from '@/lib/supabase';

export * from './errors';
export * from './orders';
export * from './quotes';
export * from './payments';
export * from './invoices';
export * from './production';
export * from './proofs';
export * from './inventory';
export * from './expenses';
export * from './projects';
export * from './profiles';
export * from './services';
export * from './pricing';
export * from './notifications';
export * from './settings';
export * from './storage';
export * from './audit';
