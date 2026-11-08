/**
 * Orders (`public.orders`) and order lines (`public.order_items`).
 *
 * Orders are created only by the `create_customer_order` RPC (`submitOrder` in
 * `src/lib/platform.ts`); there is no direct insert path from the browser.
 */
import type { InvoiceRow, OrderItemRow, OrderRow, OrderStatus, PaymentRow, ProductionJobRow } from '@/types/db';
import {
  columnsOf,
  expectCount,
  expectMaybeRow,
  expectRows,
  expectUpdatedRow,
  getClient,
  isEmptyPayload,
  newestFirst,
  pickDefined,
  selectByIds,
} from './client';
import { listInvoices } from './invoices';
import { listPayments } from './payments';
import { listJobsForOrderItems } from './production';
import { listProofs, type ProofReviewWithContext } from './proofs';

/**
 * Status update: the single existing implementation in `src/lib/platform.ts` (falls back to the
 * browser demo store when Supabase is not configured). Does not detect updates blocked by RLS.
 *
 * Access (RLS): super_admin, admin, sales, finance, production_manager, dispatch.
 */
export { updateOrderStatus } from '@/lib/platform';

const ORDER_COLUMNS = columnsOf<OrderRow>()(
  'id, reference, customer_id, customer_name, customer_email, customer_phone, payment_method, delivery_method, delivery_address, delivery_instructions, status, payment_status, customer_notes, assigned_to, due_at, subtotal, discount, tax, total, currency, created_at, updated_at',
);

const ORDER_ITEM_COLUMNS = columnsOf<OrderItemRow>()(
  'id, order_id, service_slug, service_name, configuration, quantity, estimated_amount, confirmed_amount, files, production_notes, created_at',
);

export interface ListOrdersOptions {
  /** Maximum number of rows. Default 200. */
  limit?: number;
  /** Only these statuses (an empty array means no status filter). */
  statuses?: readonly OrderStatus[];
  /** Only orders created at or after this ISO timestamp. */
  since?: string;
  /** Only orders placed by this customer (auth user id). */
  customerId?: string;
  /** Only these order ids. An empty array returns no rows. */
  ids?: readonly string[];
}

/**
 * Orders, newest first.
 *
 * Access (RLS): every staff role reads all orders; customers read only their own orders (pass
 * `customerId: user.id` to make the intent explicit).
 */
export async function listOrders(options: ListOrdersOptions = {}): Promise<OrderRow[]> {
  const client = getClient();
  const { limit = 200, statuses, since, customerId, ids } = options;

  const query = (idChunk?: string[]) => {
    let builder = client.from('orders').select(ORDER_COLUMNS);
    if (idChunk) builder = builder.in('id', idChunk);
    if (statuses?.length) builder = builder.in('status', statuses);
    if (since) builder = builder.gte('created_at', since);
    if (customerId) builder = builder.eq('customer_id', customerId);
    return builder.order('created_at', { ascending: false }).limit(limit);
  };

  if (ids) {
    const rows = await selectByIds<OrderRow>(ids, (idChunk) => query(idChunk));
    return newestFirst(rows).slice(0, limit);
  }
  return expectRows<OrderRow>(await query());
}

/**
 * A single order, or `null` when it does not exist or is not visible to the current user.
 *
 * Access (RLS): every staff role; customers for their own orders.
 */
export async function getOrder(id: string): Promise<OrderRow | null> {
  const client = getClient();
  const response = await client.from('orders').select(ORDER_COLUMNS).eq('id', id).maybeSingle();
  return expectMaybeRow<OrderRow>(response);
}

/**
 * Lines of the given orders, oldest first. Returns `[]` (without a request) for no ids.
 *
 * Access (RLS): every staff role; customers for lines of their own orders.
 */
export async function listOrderItems(orderIds: readonly string[]): Promise<OrderItemRow[]> {
  const client = getClient();
  const rows = await selectByIds<OrderItemRow>(orderIds, (idChunk) =>
    client
      .from('order_items')
      .select(ORDER_ITEM_COLUMNS)
      .in('order_id', idChunk)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
  );
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export interface CountOrdersOptions {
  /** Only these statuses (an empty array means no status filter). */
  statuses?: readonly OrderStatus[];
  /** Only orders created at or after this ISO timestamp. */
  since?: string;
  /** Only orders placed by this customer. */
  customerId?: string;
}

/**
 * Number of orders matching the filters (a `HEAD` request — no rows are transferred).
 *
 * Access (RLS): counts only the orders the current user can read (all for staff, own for customers).
 */
export async function countOrders(options: CountOrdersOptions = {}): Promise<number> {
  const client = getClient();
  const { statuses, since, customerId } = options;
  let builder = client.from('orders').select('id', { count: 'exact', head: true });
  if (statuses?.length) builder = builder.in('status', statuses);
  if (since) builder = builder.gte('created_at', since);
  if (customerId) builder = builder.eq('customer_id', customerId);
  return expectCount(await builder);
}

/** Everything about one order, for detail drawers and the customer order page. */
export interface OrderBundle {
  order: OrderRow;
  items: OrderItemRow[];
  payments: PaymentRow[];
  /** Production jobs of the order's lines (always empty for customers and for sales/finance). */
  jobs: ProductionJobRow[];
  /** Proofs of the order's lines, newest first. */
  proofs: ProofReviewWithContext[];
  invoices: InvoiceRow[];
}

/**
 * Loads an order with its lines, payments, production jobs, proofs and invoices (parallel queries).
 * Returns `null` when the order does not exist or is not visible to the current user.
 *
 * Related tables the current role cannot read come back as empty arrays (RLS filters rows): e.g.
 * customers never see jobs; dispatch sees no payments or invoices; sales sees no proofs.
 */
export async function getOrderBundle(orderId: string): Promise<OrderBundle | null> {
  getClient();
  const [order, items, payments, invoices] = await Promise.all([
    getOrder(orderId),
    listOrderItems([orderId]),
    listPayments({ orderIds: [orderId] }),
    listInvoices({ orderIds: [orderId] }),
  ]);
  if (!order) return null;

  const itemIds = items.map((item) => item.id);
  let jobs: ProductionJobRow[] = [];
  let proofs: ProofReviewWithContext[] = [];
  if (itemIds.length > 0) {
    [jobs, proofs] = await Promise.all([listJobsForOrderItems(itemIds), listProofs({ orderItemIds: itemIds })]);
  }

  return { order, items, payments, jobs, proofs, invoices };
}

/** Fields `updateOrderFields` may change. Nothing else is ever sent. */
export interface OrderFieldsPatch {
  /** ISO timestamp, or `null` to clear. */
  due_at?: string | null;
  /** Staff user id, or `null` to unassign. */
  assigned_to?: string | null;
}

/**
 * Updates an order's due date and/or assignee and returns the updated row. Throws when nothing
 * was updated (missing order, or blocked by RLS).
 *
 * Access (RLS): super_admin, admin, sales, finance, production_manager, dispatch.
 */
export async function updateOrderFields(id: string, patch: OrderFieldsPatch): Promise<OrderRow> {
  const client = getClient();
  const payload = pickDefined(patch, ['due_at', 'assigned_to'] as const);
  if (isEmptyPayload(payload)) {
    const current = await getOrder(id);
    if (!current) throw new Error('The order could not be found.');
    return current;
  }
  const response = await client.from('orders').update(payload).eq('id', id).select(ORDER_COLUMNS);
  return expectUpdatedRow<OrderRow>(response);
}
