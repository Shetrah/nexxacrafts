import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Enables the "Showing 21–40 of 134" summary (with pageSize). */
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

type PageEntry = number | 'gap';

const numberFormat = new Intl.NumberFormat('en-GB');

/** Page numbers with gaps: 1 … 4 5 [6] 7 8 … 20 (always first, last and neighbours). */
function pageEntries(page: number, pageCount: number): PageEntry[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  if (page <= 4) [2, 3, 4, 5].forEach((value) => pages.add(value));
  if (page >= pageCount - 3) [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].forEach((value) => pages.add(value));
  const sorted = Array.from(pages)
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const entries: PageEntry[] = [];
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined) {
      if (value - previous === 2) entries.push(previous + 1);
      else if (value - previous > 2) entries.push('gap');
    }
    entries.push(value);
  });
  return entries;
}

/**
 * Pager for long lists (1-based). Compact on phones: Previous · "Page x of n" · Next.
 *
 * @example <Pagination page={page} pageCount={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
 */
export function Pagination({ page, pageCount, onPageChange, totalItems, pageSize, className }: PaginationProps) {
  const count = Math.max(0, Math.floor(pageCount));
  const current = Math.min(Math.max(1, Math.floor(page)), Math.max(1, count));
  const hasSummary = typeof totalItems === 'number' && typeof pageSize === 'number' && pageSize > 0;

  if (count <= 1 && !hasSummary) return null;

  let summary: string | null = null;
  if (hasSummary) {
    if (totalItems === 0) summary = 'No results';
    else {
      const start = (current - 1) * pageSize + 1;
      const end = Math.min(current * pageSize, totalItems);
      summary = `Showing ${numberFormat.format(start)}–${numberFormat.format(end)} of ${numberFormat.format(totalItems)}`;
    }
  }

  const goTo = (target: number) => {
    const next = Math.min(Math.max(1, target), count);
    if (next !== current) onPageChange(next);
  };

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-3', className)}
    >
      {summary && <p className="whitespace-nowrap text-sm text-slate-600 tabular-nums">{summary}</p>}
      {count > 1 && (
        <div className="ml-auto flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ChevronLeft />}
            disabled={current <= 1}
            onClick={() => goTo(current - 1)}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <ul className="hidden items-center gap-1 md:flex">
            {pageEntries(current, count).map((entry, index) =>
              entry === 'gap' ? (
                <li key={`gap-${index}`} aria-hidden="true" className="w-6 select-none text-center text-sm text-slate-400">
                  …
                </li>
              ) : (
                <li key={entry}>
                  <button
                    type="button"
                    aria-label={`Page ${entry}`}
                    aria-current={entry === current ? 'page' : undefined}
                    onClick={() => goTo(entry)}
                    className={cn(
                      'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] font-medium tabular-nums transition-colors duration-150',
                      entry === current
                        ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    {entry}
                  </button>
                </li>
              ),
            )}
          </ul>
          <p className="text-sm text-slate-600 tabular-nums md:hidden" aria-live="polite">
            Page {current} of {count}
          </p>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<ChevronRight />}
            disabled={current >= count}
            onClick={() => goTo(current + 1)}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      )}
    </nav>
  );
}
