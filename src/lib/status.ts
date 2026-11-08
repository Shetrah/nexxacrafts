/**
 * Domain status vocabulary: labels, badge tones and descriptions for every status column, ordered
 * option lists for selects, the customer-facing order stages and "needs attention" sets.
 *
 * Use with `StatusBadge` (src/components/ui), e.g. `statusMeta('order', order.status, 'customer')`.
 */
import { humanize } from '@/lib/format';
import type {
  DeliveryMethod,
  InvoiceStatus,
  JobPriority,
  JobStatus,
  MovementType,
  OrderStatus,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  ProjectStatus,
  ProofStatus,
  QuoteStatus,
  TaskStatus,
} from '@/types/db';

/** Badge colour tones. Identical to the UI kit's `BadgeTone` union. */
export type BadgeTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'violet';

/** Who is reading the status: staff see operational wording, customers see friendly wording. */
export type StatusAudience = 'staff' | 'customer';

/** Maps each status kind to the values it can take. */
export interface StatusValueMap {
  /** `orders.status` */
  order: OrderStatus;
  /** `orders.payment_status` */
  payment: PaymentStatus;
  /** `payments.status` */
  paymentRecord: PaymentRecordStatus;
  /** `quote_requests.status` */
  quote: QuoteStatus;
  /** `production_jobs.status` (suggested values; the column is free text) */
  job: JobStatus;
  /** `production_jobs.priority` */
  priority: JobPriority;
  /** `proof_reviews.status` */
  proof: ProofStatus;
  /** `invoices.status` */
  invoice: InvoiceStatus;
  /** `projects.status` (suggested values; the column is free text) */
  project: ProjectStatus;
  /** `project_tasks.status` */
  task: TaskStatus;
}

export type StatusKind = keyof StatusValueMap;

export interface StatusMeta {
  label: string;
  tone: BadgeTone;
  description: string;
}

export interface StatusOption<Value extends string = string> extends StatusMeta {
  value: Value;
}

interface StatusDefinition extends StatusMeta {
  /** Customer-facing overrides; omitted fields fall back to the staff wording. */
  customer?: Partial<StatusMeta>;
}

type DefinitionTable<Kind extends StatusKind> = Record<StatusValueMap[Kind], StatusDefinition>;

/* -------------------------------------------------------------------------------------------------
 * Ordered option lists (match the selects in the staff portal)
 * -----------------------------------------------------------------------------------------------*/

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'submitted',
  'awaiting_review',
  'awaiting_payment',
  'artwork_pending',
  'awaiting_approval',
  'in_production',
  'quality_check',
  'ready_for_dispatch',
  'dispatched',
  'completed',
  'cancelled',
];

export const QUOTE_STATUSES: readonly QuoteStatus[] = [
  'submitted',
  'under_review',
  'need_information',
  'quoted',
  'accepted',
  'declined',
  'converted',
];

export const JOB_STATUSES: readonly JobStatus[] = [
  'queued',
  'assigned',
  'in_progress',
  'on_hold',
  'quality_check',
  'completed',
  'cancelled',
];

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'unpaid',
  'pending',
  'partially_paid',
  'paid',
  'refunded',
  'failed',
];

export const PAYMENT_RECORD_STATUSES: readonly PaymentRecordStatus[] = [
  'pending',
  'initiated',
  'confirmed',
  'failed',
  'refunded',
  'reconciled',
];

export const PROOF_STATUSES: readonly ProofStatus[] = ['awaiting_customer', 'approved', 'revision_requested'];

export const INVOICE_STATUSES: readonly InvoiceStatus[] = ['draft', 'issued', 'partially_paid', 'paid', 'void'];

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'planning',
  'active',
  'on_hold',
  'review',
  'completed',
  'cancelled',
];

export const JOB_PRIORITIES: readonly JobPriority[] = ['low', 'normal', 'high', 'urgent'];

const STATUS_LISTS: { [Kind in StatusKind]: readonly StatusValueMap[Kind][] } = {
  order: ORDER_STATUSES,
  payment: PAYMENT_STATUSES,
  paymentRecord: PAYMENT_RECORD_STATUSES,
  quote: QUOTE_STATUSES,
  job: JOB_STATUSES,
  priority: JOB_PRIORITIES,
  proof: PROOF_STATUSES,
  invoice: INVOICE_STATUSES,
  project: PROJECT_STATUSES,
  task: TASK_STATUSES,
};

/* -------------------------------------------------------------------------------------------------
 * Definitions
 * -----------------------------------------------------------------------------------------------*/

const ORDER: DefinitionTable<'order'> = {
  submitted: {
    label: 'Submitted',
    tone: 'info',
    description: 'New order received. Not yet reviewed by the team.',
    customer: { description: 'We have received your order.' },
  },
  awaiting_review: {
    label: 'Awaiting review',
    tone: 'warning',
    description: 'Specifications, files and pricing need checking before work can start.',
    customer: {
      label: 'Under review',
      tone: 'info',
      description: 'Our team is checking your specifications, files and pricing.',
    },
  },
  awaiting_payment: {
    label: 'Awaiting payment',
    tone: 'warning',
    description: 'The confirmed amount has been shared. Waiting for the customer to pay.',
    customer: {
      label: 'Payment due',
      description: 'Your order is confirmed. Payment is needed before work begins.',
    },
  },
  artwork_pending: {
    label: 'Artwork pending',
    tone: 'warning',
    description: 'Waiting for print-ready artwork or files from the customer.',
    customer: {
      label: 'Artwork needed',
      description: 'Please upload print-ready artwork or the files we requested.',
    },
  },
  awaiting_approval: {
    label: 'Awaiting approval',
    tone: 'violet',
    description: 'A proof has been sent. Waiting for the customer to approve it.',
    customer: {
      label: 'Awaiting your approval',
      tone: 'warning',
      description: 'Please review your proof and approve it or request changes.',
    },
  },
  in_production: {
    label: 'In production',
    tone: 'brand',
    description: 'Being produced by the responsible department.',
    customer: { description: 'Your order is being produced.' },
  },
  quality_check: {
    label: 'Quality check',
    tone: 'violet',
    description: 'Final inspection before release.',
    customer: { description: 'Your order is being inspected before release.' },
  },
  ready_for_dispatch: {
    label: 'Ready for dispatch',
    tone: 'info',
    description: 'Packed and ready for collection, delivery or courier hand-over.',
    customer: { label: 'Ready', description: 'Your order is ready to be collected or sent out.' },
  },
  dispatched: {
    label: 'Dispatched',
    tone: 'brand',
    description: 'Handed over for delivery or to the courier.',
    customer: { description: 'Your order is on its way.' },
  },
  completed: {
    label: 'Completed',
    tone: 'success',
    description: 'Delivered or collected. No further action needed.',
    customer: { description: 'Your order has been delivered or collected.' },
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'danger',
    description: 'This order was cancelled.',
    customer: { description: 'This order was cancelled. Contact us if this is unexpected.' },
  },
};

const PAYMENT: DefinitionTable<'payment'> = {
  unpaid: {
    label: 'Unpaid',
    tone: 'neutral',
    description: 'No payment has been received yet.',
    customer: { label: 'Not yet paid', description: 'No payment has been received for this order yet.' },
  },
  pending: {
    label: 'Payment pending',
    tone: 'warning',
    description: 'A payment has been started but is not yet confirmed.',
    customer: { description: 'We are waiting for your payment to be confirmed.' },
  },
  partially_paid: {
    label: 'Partially paid',
    tone: 'warning',
    description: 'Part of the amount has been received. A balance is outstanding.',
    customer: { description: 'Part of the amount has been received. A balance remains.' },
  },
  paid: {
    label: 'Paid',
    tone: 'success',
    description: 'Payment received in full.',
    customer: { description: 'Thank you. Payment has been received in full.' },
  },
  refunded: {
    label: 'Refunded',
    tone: 'neutral',
    description: 'The payment was refunded.',
    customer: { description: 'Your payment has been refunded.' },
  },
  failed: {
    label: 'Payment failed',
    tone: 'danger',
    description: 'The last payment attempt failed.',
    customer: { description: 'Your payment did not go through. Please contact us or try another method.' },
  },
};

const PAYMENT_RECORD: DefinitionTable<'paymentRecord'> = {
  pending: {
    label: 'Pending',
    tone: 'warning',
    description: 'Recorded with the order. Waiting for payment.',
    customer: { description: 'Waiting for payment.' },
  },
  initiated: {
    label: 'Initiated',
    tone: 'info',
    description: 'Payment request sent. Waiting for confirmation from the provider.',
    customer: { description: 'Your payment has started and is waiting for confirmation.' },
  },
  confirmed: {
    label: 'Confirmed',
    tone: 'success',
    description: 'Payment received and confirmed.',
  },
  failed: {
    label: 'Failed',
    tone: 'danger',
    description: 'The payment did not go through.',
  },
  refunded: {
    label: 'Refunded',
    tone: 'neutral',
    description: 'The payment was refunded.',
  },
  reconciled: {
    label: 'Reconciled',
    tone: 'success',
    description: 'Matched against bank or provider records.',
    customer: { label: 'Confirmed', description: 'Payment received and confirmed.' },
  },
};

const QUOTE: DefinitionTable<'quote'> = {
  submitted: {
    label: 'Submitted',
    tone: 'info',
    description: 'New request. Not yet reviewed.',
    customer: { description: 'We have received your request.' },
  },
  under_review: {
    label: 'Under review',
    tone: 'info',
    description: 'The team is assessing scope, specifications and pricing.',
    customer: { description: 'Our team is reviewing your requirements.' },
  },
  need_information: {
    label: 'Needs information',
    tone: 'warning',
    description: 'Waiting for more details from the customer.',
    customer: {
      label: 'Information needed',
      description: 'We need a few more details from you to prepare your quotation.',
    },
  },
  quoted: {
    label: 'Quoted',
    tone: 'brand',
    description: 'A quotation amount has been prepared.',
    customer: { label: 'Quote ready', description: 'Your quotation is ready for you to review.' },
  },
  accepted: {
    label: 'Accepted',
    tone: 'success',
    description: 'The customer accepted the quotation.',
    customer: { description: 'This quotation has been accepted.' },
  },
  declined: {
    label: 'Declined',
    tone: 'neutral',
    description: 'The quotation was declined.',
    customer: { description: 'This quotation was declined.' },
  },
  converted: {
    label: 'Converted to order',
    tone: 'success',
    description: 'An order was created from this quotation.',
    customer: { label: 'Order created', description: 'This quotation has been turned into an order.' },
  },
};

const JOB: DefinitionTable<'job'> = {
  queued: { label: 'Queued', tone: 'neutral', description: 'Waiting to be picked up by the department.' },
  assigned: { label: 'Assigned', tone: 'info', description: 'Assigned to a team member. Not started yet.' },
  in_progress: { label: 'In progress', tone: 'brand', description: 'Work is underway.' },
  on_hold: {
    label: 'On hold',
    tone: 'warning',
    description: 'Paused while waiting on files, materials or a decision.',
  },
  quality_check: { label: 'Quality check', tone: 'violet', description: 'Finished work is being inspected.' },
  completed: { label: 'Completed', tone: 'success', description: 'Work is finished.' },
  cancelled: { label: 'Cancelled', tone: 'danger', description: 'This job will not be produced.' },
};

const PRIORITY: DefinitionTable<'priority'> = {
  low: { label: 'Low', tone: 'neutral', description: 'Can wait until higher-priority work is done.' },
  normal: { label: 'Normal', tone: 'info', description: 'Standard scheduling.' },
  high: { label: 'High', tone: 'warning', description: 'Schedule ahead of normal work.' },
  urgent: { label: 'Urgent', tone: 'danger', description: 'Needs immediate attention.' },
};

const PROOF: DefinitionTable<'proof'> = {
  awaiting_customer: {
    label: 'Awaiting customer',
    tone: 'info',
    description: 'Sent to the customer for approval.',
    customer: {
      label: 'Awaiting your approval',
      tone: 'warning',
      description: 'Please review this proof and approve it or request changes.',
    },
  },
  approved: {
    label: 'Approved',
    tone: 'success',
    description: 'This proof has been approved for production.',
    customer: { description: 'You approved this proof.' },
  },
  revision_requested: {
    label: 'Revision requested',
    tone: 'warning',
    description: 'Changes were requested. Prepare a new version.',
    customer: { tone: 'info', description: 'We are updating the proof based on your comments.' },
  },
};

const INVOICE: DefinitionTable<'invoice'> = {
  draft: { label: 'Draft', tone: 'neutral', description: 'Not yet issued to the customer.' },
  issued: {
    label: 'Issued',
    tone: 'info',
    description: 'Sent to the customer. Awaiting payment.',
    customer: { label: 'Payment due', tone: 'warning', description: 'This invoice is awaiting payment.' },
  },
  partially_paid: {
    label: 'Partially paid',
    tone: 'warning',
    description: 'Part of the invoice has been paid. A balance is outstanding.',
  },
  paid: { label: 'Paid', tone: 'success', description: 'Paid in full.' },
  void: { label: 'Void', tone: 'neutral', description: 'Cancelled and no longer payable.' },
};

const PROJECT: DefinitionTable<'project'> = {
  planning: { label: 'Planning', tone: 'neutral', description: 'Scope, timeline and resources are being planned.' },
  active: { label: 'Active', tone: 'brand', description: 'Work is underway.' },
  on_hold: { label: 'On hold', tone: 'warning', description: 'Paused until a blocker is resolved.' },
  review: { label: 'In review', tone: 'violet', description: 'Deliverables are being reviewed.' },
  completed: { label: 'Completed', tone: 'success', description: 'Delivered and closed.' },
  cancelled: { label: 'Cancelled', tone: 'danger', description: 'The project was stopped.' },
};

const TASK: DefinitionTable<'task'> = {
  todo: { label: 'To do', tone: 'neutral', description: 'Not started.' },
  in_progress: { label: 'In progress', tone: 'brand', description: 'Being worked on.' },
  review: { label: 'In review', tone: 'violet', description: 'Waiting for review or sign-off.' },
  done: { label: 'Done', tone: 'success', description: 'Finished.' },
  blocked: { label: 'Blocked', tone: 'danger', description: 'Cannot continue until something else is resolved.' },
};

const DEFINITIONS: { [Kind in StatusKind]: DefinitionTable<Kind> } = {
  order: ORDER,
  payment: PAYMENT,
  paymentRecord: PAYMENT_RECORD,
  quote: QUOTE,
  job: JOB,
  priority: PRIORITY,
  proof: PROOF,
  invoice: INVOICE,
  project: PROJECT,
  task: TASK,
};

const UNKNOWN_STATUS: StatusMeta = { label: 'Unknown', tone: 'neutral', description: '' };

/**
 * Label, badge tone and description for a status value.
 *
 * Unknown values (e.g. a free-text job status) return a humanised label with a neutral tone.
 * Missing values return `'Unknown'`.
 *
 * @example statusMeta('order', 'awaiting_approval', 'customer')
 * // { label: 'Awaiting your approval', tone: 'warning', description: 'Please review your proof…' }
 */
export function statusMeta(
  kind: StatusKind,
  value: string | null | undefined,
  audience: StatusAudience = 'staff',
): StatusMeta {
  if (!value) return { ...UNKNOWN_STATUS };
  const table: Readonly<Record<string, StatusDefinition>> = DEFINITIONS[kind];
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    return { label: humanize(value), tone: 'neutral', description: '' };
  }
  const { customer, ...staff } = table[value];
  return audience === 'customer' && customer ? { ...staff, ...customer } : staff;
}

/** Shorthand for `statusMeta(kind, value, audience).label`. */
export function statusLabel(
  kind: StatusKind,
  value: string | null | undefined,
  audience: StatusAudience = 'staff',
): string {
  return statusMeta(kind, value, audience).label;
}

/**
 * Ordered `{ value, label, tone, description }` options for a status select or filter.
 *
 * @example statusOptions('order').map(o => <option key={o.value} value={o.value}>{o.label}</option>)
 */
export function statusOptions<Kind extends StatusKind>(
  kind: Kind,
  audience: StatusAudience = 'staff',
): StatusOption<StatusValueMap[Kind]>[] {
  const values: readonly StatusValueMap[Kind][] = STATUS_LISTS[kind];
  return values.map((value) => ({ value, ...statusMeta(kind, value, audience) }));
}

/* -------------------------------------------------------------------------------------------------
 * Customer-facing order stages
 * -----------------------------------------------------------------------------------------------*/

export type OrderStageId =
  | 'submitted'
  | 'review'
  | 'payment'
  | 'artwork'
  | 'production'
  | 'quality'
  | 'dispatch'
  | 'completed';

export interface OrderStage {
  id: OrderStageId;
  label: string;
  description: string;
  /** Order statuses that place an order at this stage. */
  statuses: readonly OrderStatus[];
}

/** Ordered stages for order progress (`ProgressSteps` / `Timeline`). `cancelled` is not a stage. */
export const ORDER_STAGES: readonly OrderStage[] = [
  { id: 'submitted', label: 'Submitted', description: 'Order received.', statuses: ['submitted'] },
  {
    id: 'review',
    label: 'Review',
    description: 'Specifications, files and pricing are checked.',
    statuses: ['awaiting_review'],
  },
  { id: 'payment', label: 'Payment', description: 'The confirmed amount is paid.', statuses: ['awaiting_payment'] },
  {
    id: 'artwork',
    label: 'Artwork & proof',
    description: 'Artwork is supplied and the proof approved.',
    statuses: ['artwork_pending', 'awaiting_approval'],
  },
  { id: 'production', label: 'Production', description: 'The work is produced.', statuses: ['in_production'] },
  { id: 'quality', label: 'Quality check', description: 'Finished work is inspected.', statuses: ['quality_check'] },
  {
    id: 'dispatch',
    label: 'Dispatch',
    description: 'Ready for collection, delivery or courier.',
    statuses: ['ready_for_dispatch', 'dispatched'],
  },
  { id: 'completed', label: 'Completed', description: 'Delivered or collected.', statuses: ['completed'] },
];

/**
 * Index of the order's current stage in {@link ORDER_STAGES}, or `-1` for cancelled, unknown or
 * missing statuses.
 */
export function orderStageIndex(status: string | null | undefined): number {
  if (!status) return -1;
  return ORDER_STAGES.findIndex((stage) => isOneOf(stage.statuses, status));
}

/** `true` when no further work is expected (completed or cancelled). */
export function isOrderClosed(status: string | null | undefined): boolean {
  return status === 'completed' || status === 'cancelled';
}

/* -------------------------------------------------------------------------------------------------
 * Attention sets (usable directly as `statuses` filters in src/lib/api)
 * -----------------------------------------------------------------------------------------------*/

/** Orders waiting on the team. */
export const STAFF_ORDER_ATTENTION: readonly OrderStatus[] = ['submitted', 'awaiting_review'];

/** Orders waiting on the customer. */
export const CUSTOMER_ORDER_ATTENTION: readonly OrderStatus[] = [
  'awaiting_payment',
  'artwork_pending',
  'awaiting_approval',
];

/** Quote requests that still need a response. */
export const QUOTE_OPEN: readonly QuoteStatus[] = ['submitted', 'under_review', 'need_information'];

/** Known production job statuses that are not finished (everything except completed/cancelled). */
export const JOB_OPEN: readonly JobStatus[] = ['queued', 'assigned', 'in_progress', 'on_hold', 'quality_check'];

/**
 * Type guard: `true` when `value` is one of `values`. Handy for narrowing `<select>` values.
 *
 * @example if (isOneOf(ORDER_STATUSES, event.target.value)) updateOrderStatus(id, event.target.value)
 */
export function isOneOf<Value extends string>(values: readonly Value[], value: unknown): value is Value {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

/** `true` when an order is waiting on the team. */
export function needsStaffAttention(status: string | null | undefined): boolean {
  return isOneOf(STAFF_ORDER_ATTENTION, status);
}

/** `true` when an order is waiting on the customer. */
export function needsCustomerAction(status: string | null | undefined): boolean {
  return isOneOf(CUSTOMER_ORDER_ATTENTION, status);
}

/** `true` when a quote request still needs a response. */
export function isQuoteOpen(status: string | null | undefined): boolean {
  return isOneOf(QUOTE_OPEN, status);
}

/** `true` when a production job is not completed or cancelled (unknown free-text statuses count as open). */
export function isJobOpen(status: string | null | undefined): boolean {
  return Boolean(status) && status !== 'completed' && status !== 'cancelled';
}

/* -------------------------------------------------------------------------------------------------
 * Other enumerations
 * -----------------------------------------------------------------------------------------------*/

export const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  mpesa: 'M-Pesa',
  bank: 'Bank transfer',
  card: 'Card',
};

export const DELIVERY_METHOD_LABELS: Readonly<Record<DeliveryMethod, string>> = {
  collection: 'Collection',
  local_delivery: 'Local delivery',
  courier: 'Courier',
};

export const MOVEMENT_TYPE_LABELS: Readonly<Record<MovementType, string>> = {
  receipt: 'Receipt',
  usage: 'Usage',
  adjustment: 'Adjustment',
  return: 'Return',
  waste: 'Waste',
};

function lookupLabel(table: Readonly<Record<string, string>>, value: string | null | undefined): string {
  if (!value) return '';
  return Object.prototype.hasOwnProperty.call(table, value) ? table[value] : humanize(value);
}

/** `'mpesa'` → `'M-Pesa'`. */
export function paymentMethodLabel(value: string | null | undefined): string {
  return lookupLabel(PAYMENT_METHOD_LABELS, value);
}

/** `'local_delivery'` → `'Local delivery'`. */
export function deliveryMethodLabel(value: string | null | undefined): string {
  return lookupLabel(DELIVERY_METHOD_LABELS, value);
}

/** `'receipt'` → `'Receipt'`. */
export function movementTypeLabel(value: string | null | undefined): string {
  return lookupLabel(MOVEMENT_TYPE_LABELS, value);
}
