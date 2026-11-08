import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export interface UseAsyncOptions {
  /** When `false` the loader is not called and any previous data is cleared. Default `true`. */
  enabled?: boolean;
  /**
   * Keep showing the previous data while reloading after a dependency change. Default `true`.
   * Set to `false` for detail views keyed by id, so the previous record never shows for a new id.
   */
  keepPreviousData?: boolean;
}

export type AsyncDataSetter<T> = (next: T | undefined | ((current: T | undefined) => T | undefined)) => void;

export interface UseAsyncResult<T> {
  /** Last successfully loaded value (`undefined` until the first load completes). */
  data: T | undefined;
  /** Error thrown by the last load, if any. Format it with `toErrorMessage()` from `@/lib/api`. */
  error: unknown;
  /** `true` while a load is in flight. */
  loading: boolean;
  /** Runs the loader again. Resolves when it settles; never rejects (errors land in `error`). */
  reload: () => Promise<void>;
  /** Replace or update `data` locally, e.g. after a successful update or for optimistic UI. */
  setData: AsyncDataSetter<T>;
}

interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
}

/**
 * Loads data with an async function and tracks `data` / `error` / `loading`.
 *
 * Responses that arrive after the component unmounted, after the dependencies changed or after a
 * newer `reload()` are ignored, so a slow request can never overwrite fresher data.
 *
 * @param fn - Loader. Always reads the latest closure, so it does not need to be memoised.
 * @param deps - Reload whenever these change (like `useEffect` dependencies). Use stable values —
 *   ids, strings, numbers or memoised arrays (`statuses.join()`), never inline arrays/objects.
 *
 * @example
 * const { data: orders = [], loading, error, reload } = useAsync(() => listOrders({ statuses }), [statuses.join()]);
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: DependencyList,
  options: UseAsyncOptions = {},
): UseAsyncResult<T> {
  const { enabled = true, keepPreviousData = true } = options;
  const [state, setState] = useState<AsyncState<T>>(() => ({ data: undefined, error: undefined, loading: enabled }));

  const fnRef = useRef(fn);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  const run = useCallback(async (resetData: boolean) => {
    const request = ++requestRef.current;
    setState((current) => {
      const data = resetData ? undefined : current.data;
      // Returning the same object skips a redundant render when already loading.
      return current.loading && current.error === undefined && current.data === data
        ? current
        : { data, error: undefined, loading: true };
    });
    try {
      const data = await fnRef.current();
      if (mountedRef.current && request === requestRef.current) {
        setState({ data, error: undefined, loading: false });
      }
    } catch (error) {
      if (mountedRef.current && request === requestRef.current) {
        setState((current) => ({ data: current.data, error, loading: false }));
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestRef.current += 1;
      setState((current) =>
        current.data === undefined && current.error === undefined && !current.loading
          ? current
          : { data: undefined, error: undefined, loading: false },
      );
      return;
    }
    void run(!keepPreviousData);
    // Re-run only when the caller's dependencies (or `enabled`) change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const reload = useCallback(() => run(false), [run]);

  const setData = useCallback<AsyncDataSetter<T>>((next) => {
    setState((current) => ({
      ...current,
      data:
        typeof next === 'function'
          ? (next as (value: T | undefined) => T | undefined)(current.data)
          : next,
    }));
  }, []);

  return { data: state.data, error: state.error, loading: state.loading, reload, setData };
}
