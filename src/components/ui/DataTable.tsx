import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { useMediaQuery } from './internal/useMediaQuery';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface Column<T> {
  /** Stable id (also the sort key). */
  key: string;
  /** Header label; also the label of the value in mobile cards. */
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** CSS width of the column, e.g. "8rem" or "20%". */
  width?: string;
  /** Extra classes for body cells. */
  className?: string;
  /** Hide the column below a breakpoint (desktop table). */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Role in the mobile card: primary (title) · secondary (subtitle) · badge (top-right) ·
   * meta (label: value rows, the default) · action (footer) · hidden.
   */
  mobile?: 'primary' | 'secondary' | 'badge' | 'meta' | 'hidden' | 'action';
}

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Placeholder rows while loading (default 5). */
  skeletonRows?: number;
  /** Shown when there are no rows (default: a generic EmptyState). */
  empty?: ReactNode;
  /** Makes rows clickable and keyboard operable (Enter/Space). */
  onRowClick?: (row: T) => void;
  /** Accessible name of a clickable row, e.g. (order) => `Open order ${order.reference}`. */
  rowLabel?: (row: T) => string;
  /** Current sort (rows are rendered as given — sort them yourself). */
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  /** Accessible table caption (visually hidden). */
  caption?: string;
  dense?: boolean;
  /** Header sticks while the table body scrolls (the table gets a max height). */
  stickyHeader?: boolean;
  /** Below `md`: cards (default, stacked cards) · scroll (keep the table, scroll sideways). */
  mobile?: 'cards' | 'scroll';
  /** Highlights the row with this key (e.g. the one open in a drawer). */
  selectedKey?: string | null;
  rowClassName?: (row: T) => string;
  /** Draw the outer border and radius (set false inside a Card with padding="none"). */
  bordered?: boolean;
  className?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

const HIDE_BELOW = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const;

const SKELETON_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-2/5'];

const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="radio"], [role="link"], [contenteditable="true"], [data-row-click-ignore]';

/**
 * True when a click/keypress came from an interactive element inside the row (a link, a menu
 * button…) or from a portal rendered by the row (menus bubble through the React tree), so the
 * row action must not fire. Mark custom controls with `data-row-click-ignore`.
 */
function fromNestedControl(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  const container = event.currentTarget;
  const target = event.target as Element | null;
  if (!target || !container.contains(target)) return true;
  const control = target.closest(INTERACTIVE);
  return Boolean(control && control !== container && container.contains(control));
}

function sortAria(column: { sortable?: boolean; key: string }, sort: SortState | null | undefined) {
  if (!column.sortable) return undefined;
  if (sort?.key !== column.key) return 'none' as const;
  return sort.direction === 'asc' ? ('ascending' as const) : ('descending' as const);
}

/**
 * Data list: a semantic table from `md` up (sortable headers, keyboard-operable rows, loading
 * skeleton, empty state) and stacked cards on phones.
 *
 * @example
 * <DataTable
 *   caption="Orders"
 *   columns={[
 *     { key: 'reference', header: 'Reference', cell: (o) => <span className="font-mono">{o.reference}</span>, mobile: 'primary' },
 *     { key: 'customer', header: 'Customer', cell: (o) => o.customer_name, mobile: 'secondary' },
 *     { key: 'status', header: 'Status', cell: (o) => <StatusBadge {...statusMeta('order', o.status)} />, mobile: 'badge' },
 *     { key: 'total', header: 'Total', cell: (o) => money(o.total), align: 'right', sortable: true },
 *   ]}
 *   rows={orders}
 *   rowKey={(o) => o.id}
 *   onRowClick={(o) => setSelected(o)}
 *   rowLabel={(o) => `Open order ${o.reference}`}
 * />
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 5,
  empty,
  onRowClick,
  rowLabel,
  sort,
  onSortChange,
  caption,
  dense = false,
  stickyHeader = false,
  mobile = 'cards',
  selectedKey,
  rowClassName,
  bordered = true,
  className,
}: DataTableProps<T>) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const emptyNode = empty ?? (
    <EmptyState
      size="sm"
      icon={<Inbox />}
      title="Nothing to show yet"
      description="Records appear here as soon as they are created."
    />
  );

  if (mobile === 'cards' && !isDesktop) {
    return (
      <MobileCards
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        loading={loading}
        skeletonRows={Math.min(skeletonRows, 4)}
        emptyNode={emptyNode}
        onRowClick={onRowClick}
        rowLabel={rowLabel}
        caption={caption}
        selectedKey={selectedKey}
        rowClassName={rowClassName}
        className={className}
      />
    );
  }

  const clickable = Boolean(onRowClick);
  const cellPadding = dense ? 'py-2' : 'py-3';

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick || fromNestedControl(event)) return;
    onRowClick(row);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick || event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div className={cn('min-w-0', bordered && 'overflow-hidden rounded-xl border border-line bg-white shadow-xs', className)}>
      <div className={cn('overflow-x-auto', stickyHeader && 'max-h-[min(70vh,48rem)] overflow-y-auto')}>
        <table className="w-full border-separate border-spacing-0 text-left text-sm" aria-busy={loading || undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => {
                const align = column.align ?? 'left';
                const direction = sort?.key === column.key ? sort.direction : null;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sortAria(column, sort)}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'whitespace-nowrap border-b border-line bg-slate-50 px-4 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pl-5 last:pr-5',
                      dense ? 'h-9' : 'h-10',
                      ALIGN[align],
                      column.hideBelow && HIDE_BELOW[column.hideBelow],
                      stickyHeader && 'sticky top-0 z-10',
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSortChange({ key: column.key, direction: direction === 'asc' ? 'desc' : 'asc' })
                        }
                        className={cn(
                          'group -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 font-semibold uppercase tracking-wide transition-colors duration-150 hover:text-slate-900',
                          align === 'right' && 'flex-row-reverse',
                          direction ? 'text-slate-900' : 'text-slate-500',
                        )}
                      >
                        {column.header}
                        {direction === 'asc' && <ArrowUp aria-hidden="true" className="size-3.5 text-brand-600" />}
                        {direction === 'desc' && <ArrowDown aria-hidden="true" className="size-3.5 text-brand-600" />}
                        {!direction && (
                          <ChevronsUpDown
                            aria-hidden="true"
                            className="size-3.5 text-slate-300 transition-colors duration-150 group-hover:text-slate-500"
                          />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      className={cn(
                        'border-b border-line px-4 first:pl-5 last:pr-5 [tr:last-child>&]:border-b-0',
                        cellPadding,
                        column.hideBelow && HIDE_BELOW[column.hideBelow],
                      )}
                    >
                      <Skeleton
                        className={cn(
                          'h-4',
                          SKELETON_WIDTHS[(rowIndex + columnIndex) % SKELETON_WIDTHS.length],
                          column.align === 'right' && 'ml-auto',
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyNode}
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => {
                const key = rowKey(row);
                const selected = selectedKey !== undefined && selectedKey !== null && key === selectedKey;
                return (
                  <tr
                    key={key}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
                    aria-current={selected ? 'true' : undefined}
                    onClick={clickable ? (event) => handleRowClick(event, row) : undefined}
                    onKeyDown={clickable ? (event) => handleRowKeyDown(event, row) : undefined}
                    className={cn(
                      'transition-colors duration-100',
                      selected
                        ? '[&>td:first-child]:shadow-[inset_2px_0_0_theme(colors.brand.600)] [&>td]:bg-brand-50/60'
                        : 'hover:[&>td]:bg-slate-50',
                      clickable &&
                        'cursor-pointer focus-visible:[outline-offset:-2px]',
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'border-b border-line px-4 align-middle text-slate-700 first:pl-5 last:pr-5 [tr:last-child>&]:border-b-0',
                          cellPadding,
                          ALIGN[column.align ?? 'left'],
                          column.align === 'right' && 'whitespace-nowrap tabular-nums',
                          column.hideBelow && HIDE_BELOW[column.hideBelow],
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface MobileCardsProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  loading: boolean;
  skeletonRows: number;
  emptyNode: ReactNode;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  caption?: string;
  selectedKey?: string | null;
  rowClassName?: (row: T) => string;
  className?: string;
}

/** Phone layout: one card per row, built from the columns' `mobile` roles. */
function MobileCards<T>({
  columns,
  rows,
  rowKey,
  loading,
  skeletonRows,
  emptyNode,
  onRowClick,
  rowLabel,
  caption,
  selectedKey,
  rowClassName,
  className,
}: MobileCardsProps<T>) {
  const explicitPrimary = columns.filter((column) => column.mobile === 'primary');
  // Without an explicit primary column, the first un-hinted column becomes the card title.
  const fallbackPrimary = explicitPrimary.length === 0 ? columns.find((column) => !column.mobile) : undefined;
  const primary = fallbackPrimary ? [fallbackPrimary] : explicitPrimary;
  const secondary = columns.filter((column) => column.mobile === 'secondary');
  const badges = columns.filter((column) => column.mobile === 'badge');
  const actions = columns.filter((column) => column.mobile === 'action');
  const meta = columns.filter(
    (column) => (!column.mobile || column.mobile === 'meta') && column !== fallbackPrimary,
  );

  if (loading) {
    return (
      <ul aria-busy="true" aria-label={caption} className={cn('space-y-2.5', className)}>
        {Array.from({ length: skeletonRows }, (_, index) => (
          <li key={index} className="rounded-xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (rows.length === 0) {
    return <div className={cn('rounded-xl border border-line bg-white', className)}>{emptyNode}</div>;
  }

  return (
    <ul aria-label={caption} className={cn('space-y-2.5', className)}>
      {rows.map((row) => {
        const key = rowKey(row);
        const selected = selectedKey !== undefined && selectedKey !== null && key === selectedKey;
        const title = primary.map((column) => <span key={column.key}>{column.cell(row)}</span>);

        return (
          <li
            key={key}
            aria-current={selected ? 'true' : undefined}
            onClick={
              onRowClick
                ? (event) => {
                    if (!fromNestedControl(event)) onRowClick(row);
                  }
                : undefined
            }
            className={cn(
              'rounded-xl border bg-white p-4 shadow-xs',
              selected ? 'border-brand-300 ring-1 ring-brand-600/20' : 'border-line',
              onRowClick && 'cursor-pointer transition-colors duration-100 active:bg-slate-50',
              rowClassName?.(row),
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {title.length > 0 &&
                  (onRowClick ? (
                    <button
                      type="button"
                      aria-label={rowLabel?.(row)}
                      onClick={() => onRowClick(row)}
                      className="block max-w-full break-words rounded text-left text-[15px] font-semibold leading-6 text-slate-900"
                    >
                      {title}
                    </button>
                  ) : (
                    <div className="break-words text-[15px] font-semibold leading-6 text-slate-900">{title}</div>
                  ))}
                {secondary.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-sm leading-5 text-slate-600">
                    {secondary.map((column) => (
                      <span key={column.key} className="min-w-0 break-words">
                        {column.cell(row)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {badges.length > 0 && (
                <div className="flex max-w-[50%] shrink-0 flex-wrap justify-end gap-1.5">
                  {badges.map((column) => (
                    <span key={column.key}>{column.cell(row)}</span>
                  ))}
                </div>
              )}
            </div>

            {meta.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-3 text-sm">
                {meta.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-xs leading-4 text-slate-500">{column.header}</dt>
                    <dd className={cn('mt-0.5 break-words leading-5 text-slate-800', column.align === 'right' && 'tabular-nums')}>
                      {column.cell(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {actions.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                {actions.map((column) => (
                  <span key={column.key} className="contents">
                    {column.cell(row)}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
