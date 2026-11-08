/**
 * Stock items (`public.inventory_items`) and stock movements (`public.inventory_movements`).
 *
 * Note: no database trigger applies movements to `quantity_on_hand`, and the API never writes
 * `quantity_on_hand` after creation (it is only set as the opening quantity).
 */
import type { InventoryItemRow, InventoryMovementRow } from '@/types/db';
import {
  cleanText,
  columnsOf,
  expectMaybeRow,
  expectRow,
  expectRows,
  expectUpdatedRow,
  getClient,
  isEmptyPayload,
  requireText,
  toNumber,
} from './client';

const INVENTORY_ITEM_COLUMNS = columnsOf<InventoryItemRow>()(
  'id, sku, name, category, unit, quantity_on_hand, reorder_level, average_cost, is_active, created_at, updated_at',
);

const MOVEMENT_COLUMNS = columnsOf<InventoryMovementRow>()(
  'id, inventory_item_id, movement_type, quantity, unit_cost, order_id, notes, created_by, created_at',
);

export interface ListInventoryOptions {
  /** Include archived (`is_active = false`) items. Default `false`. */
  includeInactive?: boolean;
  /** Maximum number of rows. Default 1000 (the API's maximum page size). */
  limit?: number;
}

/**
 * Stock items sorted by name.
 *
 * Access (RLS): super_admin, admin, finance, production_manager, print_operator, laser_operator.
 * Other roles receive no rows.
 */
export async function listInventory(options: ListInventoryOptions = {}): Promise<InventoryItemRow[]> {
  const client = getClient();
  const { includeInactive = false, limit = 1000 } = options;
  let builder = client.from('inventory_items').select(INVENTORY_ITEM_COLUMNS);
  if (!includeInactive) builder = builder.eq('is_active', true);
  const response = await builder.order('name', { ascending: true }).limit(limit);
  return expectRows<InventoryItemRow>(response);
}

/**
 * A single stock item, or `null` when missing or not visible.
 *
 * Access (RLS): as {@link listInventory}.
 */
export async function getInventoryItem(id: string): Promise<InventoryItemRow | null> {
  const client = getClient();
  const response = await client.from('inventory_items').select(INVENTORY_ITEM_COLUMNS).eq('id', id).maybeSingle();
  return expectMaybeRow<InventoryItemRow>(response);
}

export interface ListInventoryMovementsOptions {
  /** Maximum number of rows. Default 200. */
  limit?: number;
  /** Only movements of this stock item. */
  itemId?: string;
}

/**
 * Stock movements, newest first.
 *
 * Access (RLS): super_admin, admin, finance, production_manager, print_operator, laser_operator.
 */
export async function listInventoryMovements(
  options: ListInventoryMovementsOptions = {},
): Promise<InventoryMovementRow[]> {
  const client = getClient();
  const { limit = 200, itemId } = options;
  let builder = client.from('inventory_movements').select(MOVEMENT_COLUMNS);
  if (itemId) builder = builder.eq('inventory_item_id', itemId);
  const response = await builder.order('created_at', { ascending: false }).limit(limit);
  return expectRows<InventoryMovementRow>(response);
}

/** Values for a new stock item. Numeric fields accept form strings and are converted with `Number()`. */
export interface NewInventoryItem {
  name: string;
  /** Must be unique when provided. */
  sku?: string | null;
  category?: string | null;
  /** Default `'piece'`. */
  unit?: string | null;
  /** Opening stock. Default 0. */
  quantity_on_hand?: number | string;
  /** Default 0. */
  reorder_level?: number | string;
  /** KES per unit. Default 0. */
  average_cost?: number | string;
}

/**
 * Creates a stock item (same fields as the staff portal's "Add stock item" form) and returns it.
 *
 * Access (RLS): super_admin, admin, finance, production_manager.
 */
export async function createInventoryItem(input: NewInventoryItem): Promise<InventoryItemRow> {
  const client = getClient();
  const payload = {
    sku: cleanText(input.sku),
    name: requireText(input.name, 'Item name'),
    category: cleanText(input.category),
    unit: cleanText(input.unit) ?? 'piece',
    quantity_on_hand: toNumber(input.quantity_on_hand ?? 0, 'Opening quantity', { min: 0 }),
    reorder_level: toNumber(input.reorder_level ?? 0, 'Reorder level', { min: 0 }),
    average_cost: toNumber(input.average_cost ?? 0, 'Average cost', { min: 0 }),
  };
  const response = await client.from('inventory_items').insert(payload).select(INVENTORY_ITEM_COLUMNS).single();
  return expectRow<InventoryItemRow>(response);
}

/** Fields `updateInventoryItem` may change. `quantity_on_hand` can never be changed here. */
export interface InventoryItemPatch {
  name?: string;
  sku?: string | null;
  category?: string | null;
  unit?: string;
  reorder_level?: number | string;
  average_cost?: number | string;
  /** `false` archives the item. */
  is_active?: boolean;
}

type InventoryItemUpdate = Partial<
  Pick<InventoryItemRow, 'name' | 'sku' | 'category' | 'unit' | 'reorder_level' | 'average_cost' | 'is_active'>
>;

/**
 * Updates a stock item's details and returns the updated row. Throws when nothing was updated
 * (missing item, or blocked by RLS).
 *
 * Access (RLS): super_admin, admin, finance, production_manager.
 */
export async function updateInventoryItem(id: string, patch: InventoryItemPatch): Promise<InventoryItemRow> {
  const client = getClient();
  const payload: InventoryItemUpdate = {};
  if (patch.name !== undefined) payload.name = requireText(patch.name, 'Item name');
  if (patch.sku !== undefined) payload.sku = cleanText(patch.sku);
  if (patch.category !== undefined) payload.category = cleanText(patch.category);
  if (patch.unit !== undefined) payload.unit = requireText(patch.unit, 'Unit');
  if (patch.reorder_level !== undefined) {
    payload.reorder_level = toNumber(patch.reorder_level, 'Reorder level', { min: 0 });
  }
  if (patch.average_cost !== undefined) {
    payload.average_cost = toNumber(patch.average_cost, 'Average cost', { min: 0 });
  }
  if (patch.is_active !== undefined) payload.is_active = Boolean(patch.is_active);

  if (isEmptyPayload(payload)) {
    const current = await getInventoryItem(id);
    if (!current) throw new Error('The stock item could not be found.');
    return current;
  }
  const response = await client.from('inventory_items').update(payload).eq('id', id).select(INVENTORY_ITEM_COLUMNS);
  return expectUpdatedRow<InventoryItemRow>(response);
}
