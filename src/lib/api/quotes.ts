/**
 * Quote requests (`public.quote_requests`).
 *
 * New requests are submitted with `submitQuote` in `src/lib/platform.ts` (unchanged).
 */
import type { QuoteRequestRow, QuoteStatus } from '@/types/db';
import {
  columnsOf,
  expectMaybeRow,
  expectRows,
  expectUpdatedRow,
  getClient,
  isEmptyPayload,
  pickDefined,
} from './client';

/*
 * Status and amount updates: the single existing implementations in `src/lib/platform.ts` (they
 * fall back to the browser demo store when Supabase is not configured and do not detect updates
 * blocked by RLS). `saveQuoteAmount` also moves the request to `quoted`.
 *
 * Access (RLS): admin, sales.
 */
export { saveQuoteAmount, updateQuoteStatus } from '@/lib/platform';

/**
 * Quote request fields returned by {@link listQuotes}. The long brief (`description`),
 * `configuration` and `internal_notes` are loaded only by {@link getQuote}.
 */
export type QuoteSummary = Omit<QuoteRequestRow, 'description' | 'configuration' | 'internal_notes'>;

export interface QuoteDeliveryLog {
  id: string;
  quote_id: string;
  request_id: string;
  channel: 'email' | 'whatsapp';
  recipient: string;
  status: 'pending' | 'sent' | 'failed';
  provider_message_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

const QUOTE_SUMMARY_COLUMNS = columnsOf<QuoteSummary>()(
  'id, reference, customer_id, customer_name, email, phone, company, service_slug, status, quoted_amount, currency, assigned_to, created_at, updated_at',
);

const QUOTE_COLUMNS = columnsOf<QuoteRequestRow>()(
  'id, reference, customer_id, customer_name, email, phone, company, service_slug, description, configuration, status, quoted_amount, currency, assigned_to, internal_notes, created_at, updated_at',
);

export interface ListQuotesOptions {
  /** Maximum number of rows. Default 200. */
  limit?: number;
  /** Only these statuses, e.g. `QUOTE_OPEN` (an empty array means no status filter). */
  statuses?: readonly QuoteStatus[];
  /** Only requests created at or after this ISO timestamp. */
  since?: string;
  /** Only requests linked to this customer (auth user id). */
  customerId?: string;
}

/**
 * Quote requests (summary columns), newest first.
 *
 * Access (RLS): admin, sales and finance read every request; signed-in customers read
 * requests linked to their account (`customer_id`). Anonymous submissions are not linked to any
 * customer and are visible to staff only.
 */
export async function listQuotes(options: ListQuotesOptions = {}): Promise<QuoteSummary[]> {
  const client = getClient();
  const { limit = 200, statuses, since, customerId } = options;
  let builder = client.from('quote_requests').select(QUOTE_SUMMARY_COLUMNS);
  if (statuses?.length) builder = builder.in('status', statuses);
  if (since) builder = builder.gte('created_at', since);
  if (customerId) builder = builder.eq('customer_id', customerId);
  const response = await builder.order('created_at', { ascending: false }).limit(limit);
  return expectRows<QuoteSummary>(response);
}

/**
 * A full quote request (including description, configuration, phone, company, internal notes and
 * assignee), or `null` when missing or not visible.
 *
 * Access (RLS): as {@link listQuotes}. RLS is row-level, so a customer reading their own request
 * also receives `internal_notes` — never render it on customer screens.
 */
export async function getQuote(id: string): Promise<QuoteRequestRow | null> {
  const client = getClient();
  const response = await client.from('quote_requests').select(QUOTE_COLUMNS).eq('id', id).maybeSingle();
  return expectMaybeRow<QuoteRequestRow>(response);
}

/** All delivery attempts for a quotation, newest first. Staff-only through table RLS. */
export async function listQuoteDeliveryLogs(quoteId: string): Promise<QuoteDeliveryLog[]> {
  const client = getClient();
  const response = await client.from('quote_delivery_logs')
    .select('id,quote_id,request_id,channel,recipient,status,provider_message_id,error,sent_at,created_at')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false })
    .limit(100);
  return expectRows<QuoteDeliveryLog>(response);
}

export interface ConvertedQuoteOrder { order_id: string; order_reference: string; invoice_id: string; invoice_number: string }

/** Convert an accepted, account-linked quotation into its order and invoice atomically. */
export async function convertAcceptedQuote(id: string): Promise<ConvertedQuoteOrder> {
  const client = getClient();
  const response = await client.rpc('convert_accepted_quote', { p_quote_id: id });
  if (response.error) throw response.error;
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!row?.order_id || !row?.invoice_id) throw new Error('The database did not return the created order and invoice.');
  return row as ConvertedQuoteOrder;
}

/** Fields `updateQuoteFields` may change. Nothing else is ever sent. */
export interface QuoteFieldsPatch {
  internal_notes?: string | null;
  /** Staff user id, or `null` to unassign. */
  assigned_to?: string | null;
}

/**
 * Updates a request's internal notes and/or assignee and returns the full updated row. Throws when
 * nothing was updated (missing request, or blocked by RLS).
 *
 * Access (RLS): admin, sales.
 */
export async function updateQuoteFields(id: string, patch: QuoteFieldsPatch): Promise<QuoteRequestRow> {
  const client = getClient();
  const payload = pickDefined(patch, ['internal_notes', 'assigned_to'] as const);
  if (isEmptyPayload(payload)) {
    const current = await getQuote(id);
    if (!current) throw new Error('The quote request could not be found.');
    return current;
  }
  const response = await client.from('quote_requests').update(payload).eq('id', id).select(QUOTE_COLUMNS);
  return expectUpdatedRow<QuoteRequestRow>(response);
}
