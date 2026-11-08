const FALLBACK = 'Something went wrong. Please try again.';
const NETWORK = "We couldn't reach the server. Check your connection and try again.";

function firstLine(text: string) {
  // Never surface stack traces: keep the first line and cap the length.
  const line = text.split('\n')[0].trim();
  return line.length > 300 ? `${line.slice(0, 297)}…` : line;
}

function normalise(message: string) {
  const text = firstLine(message);
  if (!text) return FALLBACK;
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(text)) return NETWORK;
  return text;
}

/**
 * Human-readable message from anything thrown or returned: Error instances, `{ message }` objects
 * (Supabase / PostgREST errors), `{ error_description }` (auth errors) or strings.
 *
 * @example toast.error('Could not save', getErrorMessage(error))
 */
export function getErrorMessage(error: unknown, fallback: string = FALLBACK): string {
  if (typeof error === 'string') return error.trim() ? normalise(error) : fallback;
  if (error instanceof Error) return error.message ? normalise(error.message) : fallback;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    for (const key of ['message', 'error_description', 'error', 'msg']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return normalise(value);
    }
  }
  return fallback;
}
