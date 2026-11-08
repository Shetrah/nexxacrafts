/**
 * Artwork proofs (`public.proof_reviews`): staff upload versions, customers approve or request
 * changes.
 */
import type { OrderItemRow, OrderRow, ProofReviewRow, ProofStatus } from '@/types/db';
import {
  cleanText,
  columnsOf,
  expectRow,
  expectRows,
  expectUpdatedRow,
  getClient,
  newestFirst,
  nowIso,
  requireText,
  selectByIds,
  toNumber,
} from './client';

/** Order fields embedded in {@link ProofReviewWithContext}. */
export type ProofOrderContext = Pick<OrderRow, 'id' | 'reference' | 'customer_id' | 'customer_name' | 'status'>;

/** Order-line fields embedded in {@link ProofReviewWithContext}. */
export type ProofItemContext = Pick<OrderItemRow, 'id' | 'order_id' | 'service_slug' | 'service_name'> & {
  /** `null` if the order is not visible to the current user. */
  order: ProofOrderContext | null;
};

/** A proof with its order line and order (for approval queues). */
export interface ProofReviewWithContext extends ProofReviewRow {
  /** `null` if the order line is not visible to the current user. */
  order_item: ProofItemContext | null;
}

const PROOF_COLUMNS = columnsOf<ProofReviewRow>()(
  'id, order_item_id, version, file_path, status, customer_comment, reviewed_by, reviewed_at, created_at',
);

const ITEM_CONTEXT_COLUMNS = columnsOf<Omit<ProofItemContext, 'order'>>()('id, order_id, service_slug, service_name');

const ORDER_CONTEXT_COLUMNS = columnsOf<ProofOrderContext>()('id, reference, customer_id, customer_name, status');

/** proof_reviews.order_item_id → order_items.id → orders.id are many-to-one: embedded as objects. */
const PROOF_WITH_CONTEXT_SELECT = `${PROOF_COLUMNS}, order_item:order_items(${ITEM_CONTEXT_COLUMNS}, order:orders(${ORDER_CONTEXT_COLUMNS}))`;

function single<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return value !== null && typeof value === 'object' ? (value as T) : null;
}

type RawProof = ProofReviewRow & { order_item?: unknown };
type RawItem = Omit<ProofItemContext, 'order'> & { order?: unknown };

function normalizeProof(raw: RawProof): ProofReviewWithContext {
  const { order_item: rawItem, ...proof } = raw;
  const item = single<RawItem>(rawItem);
  if (!item) return { ...proof, order_item: null };
  const { order: rawOrder, ...itemFields } = item;
  return { ...proof, order_item: { ...itemFields, order: single<ProofOrderContext>(rawOrder) } };
}

export interface ListProofsOptions {
  /** Only proofs for these order lines. An empty array returns no rows. */
  orderItemIds?: readonly string[];
  /** Only these statuses (an empty array means no status filter). */
  statuses?: readonly ProofStatus[];
  /** Maximum number of rows. Default 200. */
  limit?: number;
}

/**
 * Proofs with their order line and order, newest first.
 *
 * Access (RLS): super_admin, admin, production_manager and designer read every proof; customers
 * read proofs on their own orders. Other roles receive no rows. Note: the proof *file* may still
 * be unreadable for the customer — see `createSignedFileUrl`.
 */
export async function listProofs(options: ListProofsOptions = {}): Promise<ProofReviewWithContext[]> {
  const client = getClient();
  const { orderItemIds, statuses, limit = 200 } = options;

  const query = (ids?: string[]) => {
    let builder = client.from('proof_reviews').select(PROOF_WITH_CONTEXT_SELECT);
    if (ids) builder = builder.in('order_item_id', ids);
    if (statuses?.length) builder = builder.in('status', statuses);
    return builder.order('created_at', { ascending: false }).limit(limit);
  };

  const rows = orderItemIds
    ? newestFirst(await selectByIds<RawProof>(orderItemIds, (ids) => query(ids))).slice(0, limit)
    : expectRows<RawProof>(await query());
  return rows.map(normalizeProof);
}

/**
 * The next version number for an order line's proofs (highest existing version + 1, or 1).
 *
 * Access (RLS): staff with proof access (super_admin, admin, production_manager, designer).
 */
export async function nextProofVersion(orderItemId: string): Promise<number> {
  const client = getClient();
  const response = await client
    .from('proof_reviews')
    .select('version')
    .eq('order_item_id', orderItemId)
    .order('version', { ascending: false })
    .limit(1);
  const [latest] = expectRows<Pick<ProofReviewRow, 'version'>>(response);
  return (latest?.version ?? 0) + 1;
}

export interface NewProof {
  order_item_id: string;
  /** Use {@link nextProofVersion}. `(order_item_id, version)` is unique. */
  version: number;
  /** Storage path of the uploaded proof in the `customer-files` bucket. */
  file_path: string;
}

/**
 * Records a new proof version (status `awaiting_customer` by database default) and returns it.
 *
 * Access (RLS): super_admin, admin, production_manager, designer.
 */
export async function createProof(input: NewProof): Promise<ProofReviewRow> {
  const client = getClient();
  const payload = {
    order_item_id: requireText(input.order_item_id, 'Order line'),
    version: toNumber(input.version, 'Proof version', { min: 1, integer: true }),
    file_path: requireText(input.file_path, 'Proof file'),
  };
  const response = await client.from('proof_reviews').insert(payload).select(PROOF_COLUMNS).single();
  return expectRow<ProofReviewRow>(response);
}

export interface ProofResponse {
  status: Extract<ProofStatus, 'approved' | 'revision_requested'>;
  /** Optional comment (sent only when provided; blank clears it). */
  customer_comment?: string;
}

/**
 * Approves a proof or requests a revision, stamping `reviewed_at`. Returns the updated row; throws
 * when nothing was updated.
 *
 * Access (RLS): the customer who owns the order, or super_admin, admin, production_manager, designer.
 */
export async function respondToProof(id: string, response: ProofResponse): Promise<ProofReviewRow> {
  const client = getClient();
  if (response.status !== 'approved' && response.status !== 'revision_requested') {
    throw new Error('Choose to approve the proof or request a revision.');
  }
  const payload: { status: ProofStatus; reviewed_at: string; customer_comment?: string | null } = {
    status: response.status,
    reviewed_at: nowIso(),
  };
  if (response.customer_comment !== undefined) payload.customer_comment = cleanText(response.customer_comment);

  const result = await client.from('proof_reviews').update(payload).eq('id', id).select(PROOF_COLUMNS);
  return expectUpdatedRow<ProofReviewRow>(result);
}

/**
 * Sets a proof's status (staff override). Returns the updated row; throws when nothing was updated.
 *
 * Access (RLS): super_admin, admin, production_manager, designer.
 */
export async function updateProofStatus(id: string, status: ProofStatus): Promise<ProofReviewRow> {
  const client = getClient();
  const response = await client.from('proof_reviews').update({ status }).eq('id', id).select(PROOF_COLUMNS);
  return expectUpdatedRow<ProofReviewRow>(response);
}
