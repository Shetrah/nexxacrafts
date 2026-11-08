/**
 * Business expenses (`public.expenses`).
 */
import { toDateInputValue } from '@/lib/format';
import type { ExpenseRow } from '@/types/db';
import { cleanText, columnsOf, expectRow, expectRows, getClient, requireText, toDateOnly, toNumber } from './client';

const EXPENSE_COLUMNS = columnsOf<ExpenseRow>()(
  'id, expense_date, category, description, amount, payment_account, reference, attachment_path, recorded_by, created_at',
);

/** Expense categories offered by the staff portal's expense form. */
export const EXPENSE_CATEGORIES: readonly string[] = [
  'Production materials',
  'Transport & delivery',
  'Utilities',
  'Rent',
  'Salaries & wages',
  'Repairs & maintenance',
  'Marketing',
  'Software & subscriptions',
  'Office supplies',
  'Other',
];

export interface ListExpensesOptions {
  /** Only expenses dated on or after this date (`YYYY-MM-DD`, or an ISO timestamp → local date). */
  since?: string;
  /** Maximum number of rows. Default 200. */
  limit?: number;
}

/**
 * Expenses, newest expense date first.
 *
 * Access (RLS): super_admin, admin, finance. Other roles receive no rows.
 */
export async function listExpenses(options: ListExpensesOptions = {}): Promise<ExpenseRow[]> {
  const client = getClient();
  const { since, limit = 200 } = options;
  let builder = client.from('expenses').select(EXPENSE_COLUMNS);
  if (since) builder = builder.gte('expense_date', toDateOnly(since, 'Start date'));
  const response = await builder
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return expectRows<ExpenseRow>(response);
}

/** Values for a new expense (same fields as the staff portal's expense form). */
export interface NewExpense {
  /** `YYYY-MM-DD`. Defaults to today (local date). */
  expense_date?: string;
  category: string;
  description: string;
  /** Must be greater than zero. Form strings are converted with `Number()`. */
  amount: number | string;
  payment_account?: string | null;
  reference?: string | null;
}

/**
 * Records an expense and returns it.
 *
 * Access (RLS): super_admin, admin, finance.
 */
export async function createExpense(input: NewExpense): Promise<ExpenseRow> {
  const client = getClient();
  const payload = {
    expense_date: input.expense_date ? toDateOnly(input.expense_date, 'Expense date') : toDateInputValue(),
    category: requireText(input.category, 'Category'),
    description: requireText(input.description, 'Description'),
    amount: toNumber(input.amount, 'Amount', { greaterThan: 0 }),
    payment_account: cleanText(input.payment_account),
    reference: cleanText(input.reference),
  };
  const response = await client.from('expenses').insert(payload).select(EXPENSE_COLUMNS).single();
  return expectRow<ExpenseRow>(response);
}
