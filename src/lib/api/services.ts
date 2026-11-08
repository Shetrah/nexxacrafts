/**
 * Service catalogue rows (`public.services`). The UI's field definitions, images and copy come from
 * `src/lib/catalog.ts`; this table mirrors names, categories, pricing modes and activity.
 */
import type { ServiceRow } from '@/types/db';
import { columnsOf, expectRows, getClient } from './client';

const SERVICE_COLUMNS = columnsOf<ServiceRow>()(
  'slug, name, category, description, pricing_mode, fields, is_active, sort_order, created_at, updated_at',
);

/**
 * Service rows sorted by `sort_order`.
 *
 * Access (RLS): public (anonymous included) for active services; super_admin and admin also see
 * inactive services.
 */
export async function listServiceRecords(): Promise<ServiceRow[]> {
  const client = getClient();
  const response = await client
    .from('services')
    .select(SERVICE_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  return expectRows<ServiceRow>(response);
}
