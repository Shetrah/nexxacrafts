import { useState } from 'react';
import type { ReactNode } from 'react';
import { Table2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ChartEmpty } from './ChartEmpty';
import { ChartTable } from './ChartTable';
import type { ChartTableProps } from './ChartTable';
import type { ChartTableMode } from './types';
import { useElementSize } from './useElementSize';
import { cx } from './cx';

/** Height of the toolbar row (32px row + 12px gap), reserved by the empty state. */
const TOOLBAR_HEIGHT = 44;

/** Props for {@link ChartFrame}. */
export interface ChartFrameProps {
  /** The chart's name; captions the table and labels the table toggle. */
  ariaLabel: string;
  /** Height of the graphic, including its axis band. The frame grows for legend and table. */
  height: number;
  /** Show the empty state instead of the graphic. */
  isEmpty: boolean;
  emptyLabel?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  /** Legend shown above the graphic (hidden while the table is shown). */
  legend?: ReactNode;
  /** Table-view data. */
  table: Pick<ChartTableProps, 'columns' | 'rows'>;
  /** `toggle` (default) shows a visible "Table" button; `hidden` renders an sr-only table. */
  tableMode?: ChartTableMode;
  /** Hold the previous render at reduced opacity while data refetches (no skeleton flash). */
  loading?: boolean;
  /**
   * Let the graphic's own content set the height (e.g. a donut with its legend) instead of
   * fixing it to `height`; `height` then only sizes the empty state.
   */
  autoHeight?: boolean;
  className?: string;
  /** Renders the graphic at the measured width. */
  children: (width: number) => ReactNode;
}

/**
 * Container every chart mounts on: it measures the available width, owns the table-view toggle
 * (the accessible twin of the chart) and swaps in the empty state. Fixed heights always include
 * the x-axis band, so cards never get a nested scrollbar.
 */
export function ChartFrame({
  ariaLabel,
  height,
  isEmpty,
  emptyLabel,
  emptyDescription,
  emptyIcon,
  legend,
  table,
  tableMode = 'toggle',
  loading = false,
  autoHeight = false,
  className,
  children,
}: ChartFrameProps) {
  const [measureRef, { width }] = useElementSize<HTMLDivElement>();
  const [showTable, setShowTable] = useState(false);

  const toolbar = Boolean(legend) || tableMode === 'toggle';

  if (isEmpty) {
    return (
      <div className={cx('w-full', className)}>
        <ChartEmpty
          label={emptyLabel}
          description={emptyDescription}
          icon={emptyIcon}
          height={height + (toolbar ? TOOLBAR_HEIGHT : 0)}
        />
      </div>
    );
  }

  const tableVisible = tableMode === 'toggle' && showTable;

  return (
    <div
      className={cx('w-full transition-opacity duration-200 ease-out', loading && 'opacity-50', className)}
      aria-busy={loading || undefined}
    >
      {toolbar && (
        <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">{!tableVisible && legend}</div>
          {tableMode === 'toggle' && (
            <button
              type="button"
              aria-pressed={showTable}
              aria-label={`View ${ariaLabel} as a table`}
              onClick={() => setShowTable((value) => !value)}
              className="tap-target inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-600 transition-colors duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 aria-pressed:bg-slate-100 aria-pressed:text-slate-900"
            >
              <Table2 aria-hidden="true" size={14} strokeWidth={1.75} />
              Table
            </button>
          )}
        </div>
      )}
      <div
        ref={measureRef}
        className="relative w-full"
        style={tableVisible || autoHeight ? undefined : { height }}
      >
        {tableVisible ? (
          <ChartTable caption={ariaLabel} columns={table.columns} rows={table.rows} />
        ) : (
          width > 0 && children(width)
        )}
      </div>
      {tableMode === 'hidden' && (
        <ChartTable visuallyHidden caption={ariaLabel} columns={table.columns} rows={table.rows} />
      )}
    </div>
  );
}
