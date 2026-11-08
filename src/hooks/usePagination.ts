import { useCallback, useMemo, useState } from 'react';

export interface PaginationState<T> {
  /** Current page, 1-based and always within `1..pageCount`. */
  page: number;
  /** Go to a page (values outside the valid range are clamped). */
  setPage: (page: number | ((current: number) => number)) => void;
  /** Number of pages (at least 1, even when there are no rows). */
  pageCount: number;
  /** Rows on the current page. */
  pageRows: T[];
  /** Total number of rows. */
  total: number;
  pageSize: number;
  /** 1-based index of the first row on the page (0 when empty) — for "Showing 21–40 of 132". */
  from: number;
  /** 1-based index of the last row on the page (0 when empty). */
  to: number;
}

/** Serialises a reset key so inline arrays/objects (`[search, status]`) compare by value. */
function toResetToken(value: unknown): string {
  if (value === undefined) return '';
  if (value === null || typeof value !== 'object') return `${typeof value}:${String(value)}`;
  try {
    return `json:${JSON.stringify(value)}`;
  } catch {
    return 'object';
  }
}

/**
 * Client-side pagination for an in-memory list.
 *
 * @param rows - All rows (already filtered and sorted).
 * @param pageSize - Rows per page. Default 20.
 * @param resetKey - Returns to page 1 whenever this changes, e.g. `[search, statusFilter]`.
 *   Compared by value, so inline arrays and objects are fine.
 *
 * @example const { pageRows, page, pageCount, setPage } = usePagination(filteredOrders, 20, [search, status]);
 */
export function usePagination<T>(rows: readonly T[], pageSize = 20, resetKey?: unknown): PaginationState<T> {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const token = toResetToken(resetKey);

  const [state, setState] = useState(() => ({ page: 1, token }));

  // Adjust state during render (React's recommended pattern) so the first paint is already correct:
  // reset to page 1 when the reset key changes and clamp when the list shrinks.
  const requested = state.token === token ? state.page : 1;
  const page = Math.min(Math.max(1, requested), pageCount);
  if (page !== state.page || token !== state.token) {
    setState({ page, token });
  }

  const setPage = useCallback((next: number | ((current: number) => number)) => {
    setState((previous) => {
      const target = typeof next === 'function' ? next(previous.page) : next;
      const safe = Number.isFinite(target) ? Math.max(1, Math.floor(target)) : 1;
      return { token: previous.token, page: safe };
    });
  }, []);

  const start = (page - 1) * size;
  const pageRows = useMemo(() => rows.slice(start, start + size), [rows, start, size]);

  return {
    page,
    setPage,
    pageCount,
    pageRows,
    total,
    pageSize: size,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
  };
}
