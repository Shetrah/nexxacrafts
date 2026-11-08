/**
 * Production jobs (`public.production_jobs`). One job is created automatically for every order
 * line by the `create_production_job_for_order_item` trigger; the browser never inserts jobs.
 */
import type {
  Department,
  JobPriority,
  JobStatus,
  OrderItemRow,
  OrderRow,
  ProductionJobRow,
} from '@/types/db';
import {
  columnsOf,
  expectMaybeRow,
  expectRows,
  expectUpdatedRow,
  getClient,
  isEmptyPayload,
  newestFirst,
  nowIso,
  pickDefined,
  selectByIds,
} from './client';

/** Order fields embedded in {@link ProductionJobWithContext}. */
export type ProductionJobOrderContext = Pick<
  OrderRow,
  'id' | 'reference' | 'customer_name' | 'customer_phone' | 'status' | 'delivery_method' | 'due_at' | 'created_at'
>;

/** Order-line fields embedded in {@link ProductionJobWithContext}. */
export type ProductionJobItemContext = Pick<
  OrderItemRow,
  | 'id'
  | 'order_id'
  | 'service_slug'
  | 'service_name'
  | 'configuration'
  | 'quantity'
  | 'files'
  | 'production_notes'
  | 'estimated_amount'
  | 'confirmed_amount'
> & {
  /** `null` if the order is not visible to the current user. */
  order: ProductionJobOrderContext | null;
};

/** A production job with its order line and order (for queues and job sheets). */
export interface ProductionJobWithContext extends ProductionJobRow {
  /** `null` if the order line is not visible to the current user. */
  order_item: ProductionJobItemContext | null;
}

const JOB_COLUMNS = columnsOf<ProductionJobRow>()(
  'id, order_item_id, department, status, assigned_to, priority, due_at, started_at, completed_at, notes, created_at, updated_at',
);

const ITEM_CONTEXT_COLUMNS = columnsOf<Omit<ProductionJobItemContext, 'order'>>()(
  'id, order_id, service_slug, service_name, configuration, quantity, files, production_notes, estimated_amount, confirmed_amount',
);

const ORDER_CONTEXT_COLUMNS = columnsOf<ProductionJobOrderContext>()(
  'id, reference, customer_name, customer_phone, status, delivery_method, due_at, created_at',
);

/**
 * production_jobs.order_item_id → order_items.id and order_items.order_id → orders.id are both
 * many-to-one foreign keys, so PostgREST embeds each as a single object (aliased).
 */
const JOB_WITH_CONTEXT_SELECT = `${JOB_COLUMNS}, order_item:order_items(${ITEM_CONTEXT_COLUMNS}, order:orders(${ORDER_CONTEXT_COLUMNS}))`;

/** Embedded many-to-one values are objects; tolerate `null` and (defensively) single-item arrays. */
function single<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return value !== null && typeof value === 'object' ? (value as T) : null;
}

type RawJob = ProductionJobRow & { order_item?: unknown };
type RawItem = Omit<ProductionJobItemContext, 'order'> & { order?: unknown };

function normalizeJob(raw: RawJob): ProductionJobWithContext {
  const { order_item: rawItem, ...job } = raw;
  const item = single<RawItem>(rawItem);
  if (!item) return { ...job, order_item: null };
  const { order: rawOrder, ...itemFields } = item;
  return {
    ...job,
    order_item: {
      ...itemFields,
      files: Array.isArray(itemFields.files) ? itemFields.files : [],
      order: single<ProductionJobOrderContext>(rawOrder),
    },
  };
}

export interface ListProductionJobsOptions {
  /** Maximum number of rows. Default 200. */
  limit?: number;
  /** Only these departments (an empty array means no department filter). */
  departments?: readonly Department[];
  /** Only these statuses, e.g. `JOB_OPEN` (an empty array means no status filter). */
  statuses?: readonly string[];
  /** Only jobs assigned to this user; `null` for unassigned jobs. */
  assignedTo?: string | null;
}

/**
 * Production jobs with their order line and order, newest first.
 *
 * Access (RLS): super_admin, admin, production_manager, designer, print_operator, laser_operator,
 * developer, dispatch. Customers, sales and finance receive no rows.
 */
export async function listProductionJobs(options: ListProductionJobsOptions = {}): Promise<ProductionJobWithContext[]> {
  const client = getClient();
  const { limit = 200, departments, statuses, assignedTo } = options;

  let builder = client.from('production_jobs').select(JOB_WITH_CONTEXT_SELECT);
  if (departments?.length) builder = builder.in('department', departments);
  if (statuses?.length) builder = builder.in('status', statuses);
  if (assignedTo === null) builder = builder.is('assigned_to', null);
  else if (assignedTo) builder = builder.eq('assigned_to', assignedTo);

  const response = await builder.order('created_at', { ascending: false }).limit(limit);
  return expectRows<RawJob>(response).map(normalizeJob);
}

/**
 * Production jobs (without context) for the given order lines, newest first. Returns `[]` for no ids.
 *
 * Access (RLS): as {@link listProductionJobs}.
 */
export async function listJobsForOrderItems(orderItemIds: readonly string[]): Promise<ProductionJobRow[]> {
  const client = getClient();
  const rows = await selectByIds<ProductionJobRow>(orderItemIds, (ids) =>
    client
      .from('production_jobs')
      .select(JOB_COLUMNS)
      .in('order_item_id', ids)
      .order('created_at', { ascending: false }),
  );
  return newestFirst(rows);
}

/**
 * A single production job (without context), or `null` when missing or not visible.
 *
 * Access (RLS): as {@link listProductionJobs}.
 */
export async function getProductionJob(id: string): Promise<ProductionJobRow | null> {
  const client = getClient();
  const response = await client.from('production_jobs').select(JOB_COLUMNS).eq('id', id).maybeSingle();
  return expectMaybeRow<ProductionJobRow>(response);
}

/** Fields `updateJob` may change. Nothing else is ever sent (besides the automatic timestamps). */
export interface JobPatch {
  status?: JobStatus;
  /** Staff user id, or `null` to unassign. */
  assigned_to?: string | null;
  priority?: JobPriority;
  /** ISO timestamp, or `null` to clear. */
  due_at?: string | null;
  notes?: string | null;
}

/**
 * Updates a production job and returns the updated row (merge it into a
 * {@link ProductionJobWithContext} with `{ ...job, ...updated }`).
 *
 * When the status changes to `in_progress` and the job has no `started_at`, `started_at` is set to
 * now; when it changes to `completed`, `completed_at` is set to now. Throws when nothing was
 * updated (missing job, or blocked by RLS).
 *
 * Access (RLS): super_admin, admin, production_manager, designer, print_operator, laser_operator,
 * developer, dispatch.
 */
export async function updateJob(
  job: Pick<ProductionJobRow, 'id' | 'status' | 'started_at' | 'completed_at'>,
  patch: JobPatch,
): Promise<ProductionJobRow> {
  const client = getClient();
  const payload: JobPatch & { started_at?: string; completed_at?: string } = pickDefined(patch, [
    'status',
    'assigned_to',
    'priority',
    'due_at',
    'notes',
  ] as const);

  if (payload.status !== undefined && payload.status !== job.status) {
    if (payload.status === 'in_progress' && !job.started_at) payload.started_at = nowIso();
    if (payload.status === 'completed') payload.completed_at = nowIso();
  }

  if (isEmptyPayload(payload)) {
    const current = await getProductionJob(job.id);
    if (!current) throw new Error('The production job could not be found.');
    return current;
  }
  const response = await client.from('production_jobs').update(payload).eq('id', job.id).select(JOB_COLUMNS);
  return expectUpdatedRow<ProductionJobRow>(response);
}
