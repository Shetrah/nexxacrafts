import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query, e.g. `useMediaQuery('(min-width: 768px)')`.
 * Reads synchronously on first render, so there is no layout flash in the browser.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
