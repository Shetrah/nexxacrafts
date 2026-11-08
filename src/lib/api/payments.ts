/**
 * Payment records (`public.payments`). Read-only from the browser: the order RPC creates one
 * pending payment per order, and no role may insert payments client-side.
 */
import type { PaymentRecordStatus, PaymentRow } from '@/types/db';
import { columnsOf, expectRows, getClient, newestFirst, selectByIds } from './client';

const PAYMENT_COLUMNS = columnsOf<PaymentRow>()(
  'id, order_id, method, amount, currency, status, provider, provider_reference, transaction_reference, recorded_by, confirmed_at, created_at',
);

export interface ListPaymentsOptions {
  /** Maximum number of rows. Default 200. */
  limit?: number;
  /** Only payments created at or after this ISO timestamp. */
  since?: string;
  /** Only these statuses (an empty array means no status filter). */
  statuses?: readonly PaymentRecordStatus[];
  /** Only payments for these orders. An empty array returns no rows. */
  orderIds?: readonly string[];
}

/**
 * Payment records, newest first.
 *
 * Access (RLS): super_admin, admin, finance and sales read every payment; customers read the
 * payments of their own orders. Other staff roles receive no rows.
 */
export async function listPayments(options: ListPaymentsOptions = {}): Promise<PaymentRow[]> {
  const client = getClient();
  const { limit = 200, since, statuses, orderIds } = options;

  const query = (ids?: string[]) => {
    let builder = client.from('payments').select(PAYMENT_COLUMNS);
    if (ids) builder = builder.in('order_id', ids);
    if (statuses?.length) builder = builder.in('status', statuses);
    if (since) builder = builder.gte('created_at', since);
    return builder.order('created_at', { ascending: false }).limit(limit);
  };

  if (orderIds) {
    const rows = await selectByIds<PaymentRow>(orderIds, (ids) => query(ids));
    return newestFirst(rows).slice(0, limit);
  }
  return expectRows<PaymentRow>(await query());
}
