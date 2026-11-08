/**
 * Error normalisation and user-facing error messages for the data-access layer.
 *
 * supabase-js resolves failed queries with a plain `{ message, code, details, hint }` object (not an
 * `Error` instance), so API functions convert those into {@link ApiError} before throwing. Use
 * {@link toErrorMessage} to display any caught error.
 */

/** Thrown by every API function when the Supabase environment variables are missing. */
export const NOT_CONFIGURED_MESSAGE = 'Supabase is not configured for this environment.';

export const PERMISSION_MESSAGE = "You don't have permission to do that.";
export const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";
export const SESSION_MESSAGE = 'Your session has expired. Sign in again to continue.';
export const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Code of the error thrown when an update matched no rows. Row-level security does not raise an
 * error for blocked updates — it silently updates nothing — so the API reports it explicitly.
 */
export const NO_ROWS_UPDATED = 'NO_ROWS_UPDATED';

const NO_ROWS_MESSAGE =
  'The change was not saved. The record may have been removed, or you may not have permission to change it.';

export interface ApiErrorInit {
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  original?: unknown;
}

/** A normalised PostgREST / API error. `code` holds the Postgres or PostgREST error code. */
export class ApiError extends Error {
  readonly code: string;
  readonly details: string;
  readonly hint: string;
  readonly status: number | undefined;
  /** The value originally returned or thrown by supabase-js. */
  readonly original: unknown;

  constructor(message: string, init: ApiErrorInit = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = init.code ?? '';
    this.details = init.details ?? '';
    this.hint = init.hint ?? '';
    this.status = init.status;
    this.original = init.original;
  }
}

interface ErrorInfo {
  name: string;
  message: string;
  code: string;
  details: string;
  status: number | undefined;
  statusCode: string;
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

/** Reads the common error fields from any thrown value without assuming its shape. */
function readErrorInfo(err: unknown): ErrorInfo {
  if (typeof err === 'string') {
    return { name: '', message: err, code: '', details: '', status: undefined, statusCode: '' };
  }
  if (err === null || typeof err !== 'object') {
    return { name: '', message: '', code: '', details: '', status: undefined, statusCode: '' };
  }
  const source = err as Record<string, unknown>;
  const status = typeof source.status === 'number' ? source.status : undefined;
  return {
    name: err instanceof Error ? err.name : readString(source, 'name'),
    message: err instanceof Error ? err.message : readString(source, 'message'),
    code: readString(source, 'code'),
    details: readString(source, 'details'),
    status,
    statusCode: readString(source, 'statusCode'),
  };
}

/** Converts any error value into an `Error` instance (plain PostgREST objects become {@link ApiError}). */
export function toApiError(err: unknown): Error {
  if (err instanceof Error) return err;
  const info = readErrorInfo(err);
  const source = err !== null && typeof err === 'object' ? (err as Record<string, unknown>) : {};
  return new ApiError(info.message || FALLBACK_MESSAGE, {
    code: info.code,
    details: info.details,
    hint: readString(source, 'hint'),
    status: info.status,
    original: err,
  });
}

/** The error thrown when an update affected no rows (see {@link NO_ROWS_UPDATED}). */
export function noRowsUpdatedError(): ApiError {
  return new ApiError(NO_ROWS_MESSAGE, { code: NO_ROWS_UPDATED });
}

/** `true` for failed network requests (offline, DNS, CORS, server unreachable). */
export function isNetworkError(err: unknown): boolean {
  const { name, message } = readErrorInfo(err);
  if (name === 'AuthRetryableFetchError') return true;
  if (/failed to fetch|networkerror when attempting|network request failed|fetch failed/i.test(message)) return true;
  // Safari reports "Load failed"; postgrest-js prefixes the original error name.
  const isTypeError = name === 'TypeError' || message.startsWith('TypeError:');
  return isTypeError && /load failed/i.test(message);
}

/**
 * `true` when the database or storage refused the request because of row-level security or
 * missing privileges — including updates that silently matched no rows.
 */
export function isPermissionError(err: unknown): boolean {
  const { name, code, message, details, status, statusCode } = readErrorInfo(err);
  if (code === '42501' || code === NO_ROWS_UPDATED) return true;
  // Storage API errors carry the HTTP status (auth errors are deliberately not matched here).
  if (statusCode === '403' || (status === 403 && name.startsWith('Storage'))) return true;
  return /permission denied|row-level security|row level security/i.test(`${message} ${details}`);
}

function isSessionError(err: unknown): boolean {
  const { code, message } = readErrorInfo(err);
  return code === 'PGRST301' || code === 'PGRST303' || /jwt expired|invalid jwt|refresh token not found/i.test(message);
}

/**
 * A friendly, display-ready message for any caught error.
 *
 * - Permission / RLS (`42501`, "permission denied", "row-level security") → "You don't have permission to do that."
 * - Network failures ("Failed to fetch") → "Can't reach the server. Check your connection and try again."
 * - A few common database errors (duplicates, invalid values, unsupported upload types) get plain wording.
 * - Otherwise the error's own message (or `fallback` when there is none).
 */
export function toErrorMessage(err: unknown, fallback = FALLBACK_MESSAGE): string {
  if (err === null || err === undefined) return fallback;
  const info = readErrorInfo(err);

  if (info.code === NO_ROWS_UPDATED) return info.message || NO_ROWS_MESSAGE;
  if (isNetworkError(err)) return NETWORK_MESSAGE;
  if (isSessionError(err)) return SESSION_MESSAGE;
  if (isPermissionError(err)) return PERMISSION_MESSAGE;

  const text = `${info.message} ${info.details}`;
  switch (info.code) {
    case '23505':
      return /sku/i.test(text)
        ? 'An item with this SKU already exists.'
        : 'A record with these details already exists. Refresh and try again.';
    case '23514':
      return 'Some of the values entered are not allowed. Check the form and try again.';
    case '23503':
      return 'This refers to a record that no longer exists. Refresh and try again.';
    case '22P02':
    case '22007':
    case '22008':
      return 'Some values are in the wrong format. Check the form and try again.';
    case 'PGRST116':
      return 'The requested record could not be found.';
    default:
      break;
  }

  // Storage bucket restrictions (customer-files: 20 MB, limited MIME types).
  if (/mime type/i.test(info.message) && /not supported/i.test(info.message)) {
    return 'This file type is not supported. Upload PNG, JPG, WEBP, SVG, PDF, AI/EPS, DXF, ZIP or DOCX files.';
  }
  const tooLarge = info.status === 413 || info.statusCode === '413';
  if (tooLarge || /maximum allowed size|payload too large/i.test(info.message)) {
    return 'This file is larger than the 20 MB upload limit.';
  }

  return info.message.trim() || fallback;
}
