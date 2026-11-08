/**
 * Display formatting helpers (money, numbers, dates, relative time, text).
 *
 * All formatting uses the `en-KE` locale so figures match `money()` in `src/lib/catalog.ts`
 * (re-exported here for convenience). Every formatter accepts `null`/`undefined` and returns a
 * fallback (an em dash by default) instead of throwing.
 */
export { money } from '@/lib/catalog';

/** Locale used for all formatting. */
export const LOCALE = 'en-KE';

/** Default currency (ISO 4217). */
export const DEFAULT_CURRENCY = 'KES';

/** Placeholder rendered when a value is missing. */
export const EMPTY_VALUE = '—';

export type DateInput = string | number | Date | null | undefined;
export type DateStyle = 'short' | 'medium' | 'long';

/* -------------------------------------------------------------------------------------------------
 * Numbers & money
 * -----------------------------------------------------------------------------------------------*/

const numberFormatters = new Map<string, Intl.NumberFormat>();

/** Returns a cached `Intl.NumberFormat` (creating formatters is comparatively expensive). */
function getNumberFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export interface MoneyFormatOptions {
  /** ISO 4217 currency code. Default `'KES'`. */
  currency?: string;
  /** Returned when the amount is missing or not a finite number. Default `'—'`. */
  fallback?: string;
  /** Number of decimals. Default `0`. */
  decimals?: number;
}

/**
 * Formats an amount of money, e.g. `formatMoney(1500)` → `'Ksh 1,500'`.
 *
 * @example formatMoney(null, { fallback: 'To be quoted' }) // 'To be quoted'
 * @example formatMoney(99.5, { currency: 'USD', decimals: 2 }) // 'US$99.50'
 */
export function formatMoney(amount: number | null | undefined, opts: MoneyFormatOptions = {}): string {
  const { currency = DEFAULT_CURRENCY, fallback = EMPTY_VALUE, decimals = 0 } = opts;
  if (!isFiniteNumber(amount)) return fallback;
  const code = (currency || DEFAULT_CURRENCY).trim().toUpperCase();
  try {
    return getNumberFormatter({
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    // Invalid currency code (e.g. a typo in company settings): show the code and the number.
    return `${code} ${formatNumber(amount, { decimals })}`;
  }
}

export interface NumberFormatOptions {
  /** Exact number of decimals (sets both the minimum and the maximum). */
  decimals?: number;
  /** Maximum number of decimals when `decimals` is not set. Default `2`. */
  maxDecimals?: number;
  /** Compact notation, e.g. `125000` → `'125K'`. */
  compact?: boolean;
  /** Returned when the value is missing or not a finite number. Default `'—'`. */
  fallback?: string;
}

/**
 * Formats a number with `en-KE` grouping, e.g. `formatNumber(1234.5)` → `'1,234.5'`.
 */
export function formatNumber(value: number | null | undefined, opts: NumberFormatOptions = {}): string {
  const { decimals, maxDecimals = 2, compact = false, fallback = EMPTY_VALUE } = opts;
  if (!isFiniteNumber(value)) return fallback;
  return getNumberFormatter({
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? maxDecimals,
  }).format(value);
}

/**
 * Formats a ratio as a percentage, e.g. `formatPercent(0.256)` → `'26%'`,
 * `formatPercent(0.256, 1)` → `'25.6%'`.
 */
export function formatPercent(ratio: number | null | undefined, decimals = 0, fallback = EMPTY_VALUE): string {
  if (!isFiniteNumber(ratio)) return fallback;
  return getNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

/** Formats a byte count, e.g. `formatFileSize(1536000)` → `'1.5 MB'`. */
export function formatFileSize(bytes: number | null | undefined, fallback = EMPTY_VALUE): string {
  if (!isFiniteNumber(bytes) || bytes < 0) return fallback;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${formatNumber(size, { maxDecimals: unit === 0 ? 0 : 1 })} ${units[unit]}`;
}

/* -------------------------------------------------------------------------------------------------
 * Dates
 * -----------------------------------------------------------------------------------------------*/

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `true` for `YYYY-MM-DD` strings (Postgres `date` columns). */
export function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY.test(value);
}

/**
 * Parses a date input. `YYYY-MM-DD` strings are treated as local calendar dates (not UTC
 * midnight), so `date` columns never shift by a day. Returns `null` for missing/invalid input.
 */
export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const match = DATE_ONLY.exec(value);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats a calendar date.
 * - `short` → `'07/11/2026'`
 * - `medium` (default) → `'7 Nov 2026'`
 * - `long` → `'7 November 2026'`
 */
export function formatDate(value: DateInput, style: DateStyle = 'medium', fallback = EMPTY_VALUE): string {
  const date = toDate(value);
  return date ? getDateFormatter({ dateStyle: style }).format(date) : fallback;
}

/**
 * Formats a date and time, e.g. `'7 Nov 2026, 14:05'` (medium). A `YYYY-MM-DD` value has no
 * time component, so it is formatted as a date only.
 */
export function formatDateTime(value: DateInput, style: DateStyle = 'medium', fallback = EMPTY_VALUE): string {
  if (isDateOnly(value)) return formatDate(value, style, fallback);
  const date = toDate(value);
  return date ? getDateFormatter({ dateStyle: style, timeStyle: 'short' }).format(date) : fallback;
}

/** Formats a time of day, e.g. `'14:05'`. */
export function formatTime(value: DateInput, fallback = EMPTY_VALUE): string {
  const date = toDate(value);
  return date ? getDateFormatter({ timeStyle: 'short' }).format(date) : fallback;
}

let relativeFormatter: Intl.RelativeTimeFormat | null = null;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Whole local calendar days since the epoch (DST-safe thanks to rounding). */
function calendarDay(date: Date): number {
  return Math.round(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / (DAY * 1000));
}

/**
 * Formats a date relative to now, e.g. `'just now'`, `'3 hours ago'`, `'yesterday'`, `'in 2 days'`.
 * Day-level phrases use local calendar days, so "yesterday" always means the previous date.
 *
 * @param now - Reference time (defaults to the current time); useful for tests and stable renders.
 */
export function formatRelative(value: DateInput, now: DateInput = Date.now(), fallback = EMPTY_VALUE): string {
  const date = toDate(value);
  const reference = toDate(now) ?? new Date();
  if (!date) return fallback;
  const seconds = (date.getTime() - reference.getTime()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';

  const formatter = (relativeFormatter ??= new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' }));
  const format = (amount: number, unit: Intl.RelativeTimeFormatUnit) => formatter.format(Math.round(amount), unit);

  if (abs < 45 * MINUTE) return format(seconds / MINUTE, 'minute');
  if (abs < 22 * HOUR) return format(seconds / HOUR, 'hour');
  if (abs < WEEK) {
    const days = calendarDay(date) - calendarDay(reference);
    return days === 0 ? format(seconds / HOUR, 'hour') : format(days, 'day');
  }
  if (abs < MONTH) return format(seconds / WEEK, 'week');
  if (abs < YEAR) return format(seconds / MONTH, 'month');
  return format(seconds / YEAR, 'year');
}

/**
 * `true` when a due date has passed and the work is not done. A `YYYY-MM-DD` due date is
 * overdue only once that whole day has ended (local time).
 */
export function isOverdue(dateIso: DateInput, done = false, now: DateInput = Date.now()): boolean {
  if (done) return false;
  const due = toDate(dateIso);
  const reference = toDate(now) ?? new Date();
  if (!due) return false;
  if (isDateOnly(dateIso)) {
    const endOfDay = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1);
    return reference.getTime() >= endOfDay.getTime();
  }
  return due.getTime() < reference.getTime();
}

/**
 * Returns a local `YYYY-MM-DD` string for `<input type="date">` values and `date` columns.
 * Unlike `toISOString().slice(0, 10)` this never shifts to the UTC date.
 */
export function toDateInputValue(value: DateInput = new Date()): string {
  const date = toDate(value);
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/* -------------------------------------------------------------------------------------------------
 * Text
 * -----------------------------------------------------------------------------------------------*/

/**
 * Converts `snake_case`, `kebab-case` or `camelCase` identifiers to sentence case,
 * e.g. `'awaiting_review'` → `'Awaiting review'`.
 */
export function humanize(value: string | null | undefined): string {
  if (!value) return '';
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

/**
 * Up to two initials for an avatar: first and last word of a name, e.g. `'Jane W. Doe'` → `'JD'`.
 * Email addresses use the part before `@` (`'jane.doe@x.com'` → `'JD'`).
 */
export function initials(name: string | null | undefined, fallback = ''): string {
  const source = (name ?? '').trim().split('@')[0];
  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return fallback;
  const first = Array.from(words[0])[0] ?? '';
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? '') : '';
  return (first + last).toLocaleUpperCase(LOCALE) || fallback;
}

/**
 * Count plus the correctly pluralised noun, e.g. `pluralize(1, 'job')` → `'1 job'`,
 * `pluralize(1204, 'order')` → `'1,204 orders'`, `pluralize(2, 'person', 'people')` → `'2 people'`.
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** Shortens text to `max` characters, adding an ellipsis when it was cut. */
export function truncate(value: string | null | undefined, max: number): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…` : value;
}
