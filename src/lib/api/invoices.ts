/**
 * Invoices (`public.invoices`).
 */
import type { InvoiceRow, InvoiceStatus } from '@/types/db';
import {
  cleanText,
  columnsOf,
  expectMaybeRow,
  expectRow,
  expectRows,
  expectUpdatedRow,
  getClient,
  isEmptyPayload,
  newestFirst,
  pickDefined,
  requireText,
  selectByIds,
  toNumber,
  toOptionalDateOnly,
} from './client';

const INVOICE_COLUMNS = columnsOf<InvoiceRow>()(
  'id, order_id, invoice_number, customer_name, customer_email, subtotal, tax, total, amount_paid, status, due_date, issued_at, created_by, created_at',
);

const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomBase36(length: number): string {
  const values = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < length; index += 1) values[index] = Math.floor(Math.random() * 0x100000000);
  }
  return Array.from(values, (value) => BASE36[value % BASE36.length]).join('');
}

/**
 * A new invoice number in the same style as order/quote references:
 * `'INV-' + yymmdd (UTC) + '-' + 5 random base-36 characters`, e.g. `'INV-261107-K3P9Q'`.
 */
export function generateInvoiceNumber(date: Date = new Date()): string {
  return `INV-${date.toISOString().slice(2, 10).replace(/-/g, '')}-${randomBase36(5)}`;
}

export interface ListInvoicesOptions {
  /** Maximum number of rows. Default 200. */
  limit?: number;
  /** Only these statuses (an empty array means no status filter). */
  statuses?: readonly InvoiceStatus[];
  /** Only invoices for these orders. An empty array returns no rows. */
  orderIds?: readonly string[];
}

/**
 * Invoices, newest first.
 *
 * Access (RLS): super_admin, admin, finance and sales read every invoice; customers read invoices
 * linked to their own orders — including drafts, so customer screens should hide `draft`/`void`.
 */
export async function listInvoices(options: ListInvoicesOptions = {}): Promise<InvoiceRow[]> {
  const client = getClient();
  const { limit = 200, statuses, orderIds } = options;

  const query = (ids?: string[]) => {
    let builder = client.from('invoices').select(INVOICE_COLUMNS);
    if (ids) builder = builder.in('order_id', ids);
    if (statuses?.length) builder = builder.in('status', statuses);
    return builder.order('created_at', { ascending: false }).limit(limit);
  };

  if (orderIds) {
    const rows = await selectByIds<InvoiceRow>(orderIds, (ids) => query(ids));
    return newestFirst(rows).slice(0, limit);
  }
  return expectRows<InvoiceRow>(await query());
}

/**
 * A single invoice, or `null` when missing or not visible.
 *
 * Access (RLS): as {@link listInvoices}.
 */
export async function getInvoice(id: string): Promise<InvoiceRow | null> {
  const client = getClient();
  const response = await client.from('invoices').select(INVOICE_COLUMNS).eq('id', id).maybeSingle();
  return expectMaybeRow<InvoiceRow>(response);
}

export interface NewInvoice {
  /** Linked order (optional). Customers can only see invoices that are linked to their order. */
  order_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  /** `YYYY-MM-DD`. */
  due_date?: string | null;
  /** Id of the staff member creating the invoice. */
  created_by: string;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
}

/**
 * Creates a draft invoice with a generated invoice number (retried if the number is taken) and
 * returns it. Amounts must be non-negative numbers.
 *
 * Access (RLS): super_admin, admin, finance.
 */
export async function createInvoice(input: NewInvoice): Promise<InvoiceRow> {
  const client = getClient();
  const payload = {
    order_id: input.order_id || null,
    customer_name: requireText(input.customer_name, 'Customer name'),
    customer_email: cleanText(input.customer_email),
    subtotal: toNumber(input.subtotal, 'Subtotal', { min: 0 }),
    tax: toNumber(input.tax, 'Tax', { min: 0 }),
    total: toNumber(input.total, 'Total', { min: 0 }),
    due_date: toOptionalDateOnly(input.due_date, 'Due date'),
    status: 'draft' satisfies InvoiceStatus,
    created_by: input.created_by,
  };

  const insert = () =>
    client
      .from('invoices')
      .insert({ ...payload, invoice_number: generateInvoiceNumber() })
      .select(INVOICE_COLUMNS)
      .single();

  let response = await insert();
  for (let retry = 0; retry < 2 && isUniqueViolation(response.error); retry += 1) {
    response = await insert();
  }
  return expectRow<InvoiceRow>(response);
}

/** Fields `updateInvoice` may change. Nothing else is ever sent. */
export interface InvoicePatch {
  status?: InvoiceStatus;
  /** ISO timestamp; set it when issuing (`new Date().toISOString()`). */
  issued_at?: string | null;
  amount_paid?: number;
  /** `YYYY-MM-DD`, or `null` to clear. */
  due_date?: string | null;
}

/**
 * Updates an invoice and returns the updated row. Throws when nothing was updated (missing
 * invoice, or blocked by RLS).
 *
 * Access (RLS): super_admin, admin, finance.
 */
export async function updateInvoice(id: string, patch: InvoicePatch): Promise<InvoiceRow> {
  const client = getClient();
  const payload = pickDefined(patch, ['status', 'issued_at', 'amount_paid', 'due_date'] as const);
  if (payload.amount_paid !== undefined) payload.amount_paid = toNumber(payload.amount_paid, 'Amount paid', { min: 0 });
  if (payload.due_date !== undefined) payload.due_date = toOptionalDateOnly(payload.due_date, 'Due date');

  if (isEmptyPayload(payload)) {
    const current = await getInvoice(id);
    if (!current) throw new Error('The invoice could not be found.');
    return current;
  }
  const response = await client.from('invoices').update(payload).eq('id', id).select(INVOICE_COLUMNS);
  return expectUpdatedRow<InvoiceRow>(response);
}
