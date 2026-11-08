import { useEffect } from 'react';

/** Brand suffix appended to every page title. */
export const TITLE_SUFFIX = 'nexxacrafts';

/** Builds a document title, e.g. `formatDocumentTitle('Orders')` → `'Orders · nexxacrafts'`. */
export function formatDocumentTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed ? `${trimmed} · ${TITLE_SUFFIX}` : TITLE_SUFFIX;
}

/**
 * Sets `document.title` to `"Title · nexxacrafts"` while the component is mounted and restores the
 * previous title on unmount. Pass `null` to leave the title untouched (e.g. while data loads).
 *
 * Call it from page components only, not layouts: React runs parent effects after child effects,
 * so a layout title would override the page title on mount.
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title === null || typeof document === 'undefined') return;
    const previous = document.title;
    document.title = formatDocumentTitle(title);
    return () => {
      document.title = previous;
    };
  }, [title]);
}
