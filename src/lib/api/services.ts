/**
 * Service catalogue rows (`public.services`). The UI's field definitions, images and copy come from
 * `src/lib/catalog.ts`; the table stores the editable public copy and image.
 */
import type { Json, ServiceRow } from '@/types/db';
import { columnsOf, expectRow, expectRows, getClient } from './client';

const SERVICE_COLUMNS = columnsOf<ServiceRow>()(
  'slug, name, category, description, image_url, pricing_mode, fields, is_active, sort_order, created_at, updated_at',
);

/**
 * Service rows sorted by `sort_order`.
 *
 * Access (RLS): public (anonymous included) for active services; administrators also see
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

export type NewServiceRecord = Pick<ServiceRow, 'slug' | 'name' | 'category' | 'description' | 'pricing_mode' | 'fields'> &
  Partial<Pick<ServiceRow, 'image_url' | 'is_active' | 'sort_order'>>;
export type ServiceRecordPatch = Partial<Pick<ServiceRow, 'name' | 'category' | 'description' | 'image_url' | 'pricing_mode' | 'fields' | 'is_active' | 'sort_order'>>;

/** Adds a service catalogue entry. Admin access is enforced by the services table RLS policy. */
export async function createServiceRecord(input: NewServiceRecord): Promise<ServiceRow> {
  const client = getClient();
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Use a lowercase service slug with hyphens only.');
  const response = await client.from('services').insert({
    ...input,
    slug,
    name: input.name.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
  }).select(SERVICE_COLUMNS).single();
  return expectRow<ServiceRow>(response);
}

/** Updates catalogue details without changing a slug referenced by orders or pricing rules. */
export async function updateServiceRecord(slug: string, patch: ServiceRecordPatch): Promise<ServiceRow> {
  const client = getClient();
  const payload: Record<string, unknown> = { ...patch };
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.category !== undefined) payload.category = patch.category.trim();
  if (patch.description !== undefined) payload.description = patch.description.trim();
  if (patch.sort_order !== undefined) payload.sort_order = Math.trunc(patch.sort_order);
  if (patch.fields !== undefined) payload.fields = patch.fields as Json;
  const response = await client.from('services').update(payload).eq('slug', slug).select(SERVICE_COLUMNS).single();
  return expectRow<ServiceRow>(response);
}
