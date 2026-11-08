/**
 * Internal helpers shared by the API modules. Not re-exported from `@/lib/api`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isDateOnly, toDateInputValue } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { NOT_CONFIGURED_MESSAGE, noRowsUpdatedError, toApiError } from './errors';

/** The fields of a supabase-js query response that the API reads. */
export interface QueryResponse {
  data: unknown;
  error: unknown;
}

export interface CountResponse {
  count: number | null;
  error: unknown;
}

/** Returns the Supabase client or throws when the environment is not configured. */
export function getClient(): SupabaseClient {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  return supabase;
}

/* -------------------------------------------------------------------------------------------------
 * Column lists checked against row types at compile time
 * -----------------------------------------------------------------------------------------------*/

type Trim<Value extends string> = Value extends ` ${infer Rest}`
  ? Trim<Rest>
  : Value extends `${infer Rest} `
    ? Trim<Rest>
    : Value;

/** `'id, name'` → `'id' | 'name'`. */
type ColumnNames<List extends string> = List extends `${infer Head},${infer Rest}`
  ? Trim<Head> | ColumnNames<Rest>
  : Trim<List>;

type ColumnCheck<Row, List extends string> = [
  Exclude<keyof Row, ColumnNames<List>>,
  Exclude<ColumnNames<List>, keyof Row>,
] extends [never, never]
  ? unknown
  : {
      error: 'The column list must name exactly the keys of the row type';
      missing: Exclude<keyof Row, ColumnNames<List>>;
      unknown: Exclude<ColumnNames<List>, keyof Row>;
    };

/**
 * Declares a PostgREST column list for `Row`. It does not compile unless the list names exactly the
 * keys of `Row`, so selects can never drift from the row types.
 *
 * @example const ORDER_COLUMNS = columnsOf<OrderRow>()('id, reference, …');
 */
export function columnsOf<Row>() {
  return <List extends string>(list: List & ColumnCheck<Row, List>): List => list;
}

/* -------------------------------------------------------------------------------------------------
 * Response handling
 * -----------------------------------------------------------------------------------------------*/

/** Rows of a list query (throws on error). */
export function expectRows<T>(response: QueryResponse): T[] {
  if (response.error) throw toApiError(response.error);
  return Array.isArray(response.data) ? (response.data as T[]) : [];
}

/** Row of a `.maybeSingle()` query, or `null` (throws on error). */
export function expectMaybeRow<T>(response: QueryResponse): T | null {
  if (response.error) throw toApiError(response.error);
  return (response.data ?? null) as T | null;
}

/** Row returned by `.insert(…).select(…).single()` (throws on error). */
export function expectRow<T>(response: QueryResponse): T {
  if (response.error) throw toApiError(response.error);
  if (response.data === null || response.data === undefined) throw noRowsUpdatedError();
  return response.data as T;
}

/**
 * First row returned by `.update(…).select(…)`. Throws when no row was updated, which is how
 * row-level security reports a blocked update (it does not raise an error).
 */
export function expectUpdatedRow<T>(response: QueryResponse): T {
  if (response.error) throw toApiError(response.error);
  const rows = Array.isArray(response.data) ? response.data : response.data ? [response.data] : [];
  if (rows.length === 0) throw noRowsUpdatedError();
  return rows[0] as T;
}

/** Throws when the response has an error. */
export function expectOk(response: { error: unknown }): void {
  if (response.error) throw toApiError(response.error);
}

/** Count of a `{ count: 'exact', head: true }` query (throws on error). */
export function expectCount(response: CountResponse): number {
  if (response.error) throw toApiError(response.error);
  return response.count ?? 0;
}

/* -------------------------------------------------------------------------------------------------
 * `.in()` filters
 * -----------------------------------------------------------------------------------------------*/

/** Ids per `.in()` request — keeps request URLs well below server limits. */
const IN_FILTER_CHUNK_SIZE = 100;

/** Distinct, non-empty values. */
export function uniqueValues(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function chunk<T>(values: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

/**
 * Runs `query` for each chunk of distinct ids (in parallel) and concatenates the rows.
 * Returns `[]` without a request when there are no ids.
 */
export async function selectByIds<T>(
  ids: readonly string[],
  query: (idChunk: string[]) => PromiseLike<QueryResponse>,
): Promise<T[]> {
  const unique = uniqueValues(ids);
  if (unique.length === 0) return [];
  const responses = await Promise.all(chunk(unique, IN_FILTER_CHUNK_SIZE).map((idChunk) => query(idChunk)));
  return responses.flatMap((response) => expectRows<T>(response));
}

/** Sorts rows by `created_at`, newest first (used after merging chunked results). */
export function newestFirst<T extends { created_at: string | null }>(rows: T[]): T[] {
  return rows.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

/* -------------------------------------------------------------------------------------------------
 * Write payloads
 * -----------------------------------------------------------------------------------------------*/

/**
 * Copies only the listed keys whose value is not `undefined`. Every write builds its payload with
 * this, so no column outside the allowed list can ever be sent.
 */
export function pickDefined<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

/** `true` when a payload has no keys. */
export function isEmptyPayload(payload: object): boolean {
  return Object.keys(payload).length === 0;
}

/** Current time as an ISO string (for timestamp columns). */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Trimmed text, or `null` when blank. */
export function cleanText(value: string | null | undefined): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text : null;
}

/** Trimmed text that must not be blank. */
export function requireText(value: string | null | undefined, label: string): string {
  const text = cleanText(value);
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

export interface NumberRules {
  /** Smallest allowed value (inclusive). */
  min?: number;
  /** Value must be strictly greater than this. */
  greaterThan?: number;
  /** Must be a whole number. */
  integer?: boolean;
}

/** Converts with `Number()` and validates; throws a friendly error naming the field. */
export function toNumber(value: number | string | null | undefined, label: string, rules: NumberRules = {}): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number.`);
  if (rules.integer && !Number.isInteger(parsed)) throw new Error(`${label} must be a whole number.`);
  if (rules.min !== undefined && parsed < rules.min) {
    throw new Error(rules.min === 0 ? `${label} cannot be negative.` : `${label} must be at least ${rules.min}.`);
  }
  if (rules.greaterThan !== undefined && parsed <= rules.greaterThan) {
    throw new Error(`${label} must be greater than ${rules.greaterThan}.`);
  }
  return parsed;
}

/** Like {@link toNumber} but blank values (`null`, `undefined`, `''`) become `null`. */
export function toOptionalNumber(
  value: number | string | null | undefined,
  label: string,
  rules: NumberRules = {},
): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  return toNumber(value, label, rules);
}

/** A `YYYY-MM-DD` value for `date` columns; ISO timestamps are converted to the local date. */
export function toDateOnly(value: string, label: string): string {
  if (isDateOnly(value)) return value;
  const date = toDateInputValue(value);
  if (!date) throw new Error(`${label} must be a valid date.`);
  return date;
}

/** `toDateOnly` for optional columns: blank values become `null`. */
export function toOptionalDateOnly(value: string | null | undefined, label: string): string | null {
  return value ? toDateOnly(value, label) : null;
}
