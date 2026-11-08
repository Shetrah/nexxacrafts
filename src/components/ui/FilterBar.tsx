import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FilterBarProps {
  /** Search first (it grows), then filters (Select, SegmentedControl…). */
  children: ReactNode;
  /** Right-aligned actions (e.g. "Export", "Reset filters"). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Responsive row for list controls. Phones: search full-width with filters in a two-column grid
 * below; from `sm` up: one wrapping row where the first child (search) grows.
 *
 * @example
 * <FilterBar actions={<Button variant="ghost" onClick={reset}>Reset</Button>}>
 *   <SearchInput value={query} onChange={setQuery} placeholder="Search orders" />
 *   <Select aria-label="Status" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
 * </FilterBar>
 */
export function FilterBar({ children, actions, className }: FilterBarProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center', className)}>
      <div
        className={cn(
          'grid min-w-0 flex-1 grid-cols-2 gap-2',
          '[&>*:first-child]:col-span-2 [&>*]:min-w-0',
          'sm:flex sm:flex-wrap sm:items-center sm:[&>*:first-child]:min-w-[16rem] sm:[&>*:first-child]:flex-1 sm:[&>*]:w-auto',
        )}
      >
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto">{actions}</div>}
    </div>
  );
}
