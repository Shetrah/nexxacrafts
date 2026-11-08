import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from './cx';

/** One readout row: the value leads, the series label follows. */
export interface ChartTooltipRow {
  label: string;
  value: string;
  /** Series colour for the key beside the row. Omit for rows without a series (e.g. a share). */
  color?: string;
  /** Key shape: a short line (default — tooltip density) or a square. */
  marker?: 'line' | 'square';
  /** Emphasise this row (e.g. the hovered segment). */
  active?: boolean;
}

/** Props for {@link ChartTooltip}. */
export interface ChartTooltipProps {
  /** Anchor point in the positioning container's pixels. */
  x: number;
  y: number;
  /** Size of the positioning container; the tooltip never leaves it horizontally. */
  bounds: { width: number; height: number };
  /** Heading, usually the category or date. */
  title?: string;
  rows: ChartTooltipRow[];
  /** Optional summary line under the rows (e.g. a stacked total). */
  footer?: ReactNode;
  /**
   * `side` sits beside the anchor and flips left near the right edge (crosshairs, columns);
   * `top` centres above the anchor (the mark's top edge) and drops below the container when the
   * viewport has no room above (thin horizontal marks).
   */
  placement?: 'side' | 'top';
  className?: string;
}

const GAP = 12;

/**
 * Floating readout for the hovered or focused mark. Purely visual (`aria-hidden`): the same
 * details are in the focused target's accessible name and in the chart's table view, so the
 * tooltip enhances and never gates.
 */
export function ChartTooltip({
  x,
  y,
  bounds,
  title,
  rows,
  footer,
  placement = 'side',
  className,
}: ChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const maxLeft = Math.max(0, bounds.width - width);
    let left: number;
    let top: number;
    if (placement === 'top') {
      left = x - width / 2;
      const parent = node.offsetParent;
      const parentTop = parent instanceof HTMLElement ? parent.getBoundingClientRect().top : 0;
      top = y - height - GAP;
      if (parentTop + top < 8) top = bounds.height + GAP;
    } else {
      left = x + GAP;
      if (left + width > bounds.width) left = x - GAP - width;
      top = y - height / 2;
      top = Math.min(Math.max(top, 0), Math.max(0, bounds.height - height));
    }
    left = Math.min(Math.max(left, 0), maxLeft);
    setPosition((previous) =>
      previous && previous.left === left && previous.top === top ? previous : { left, top },
    );
  }, [x, y, bounds.width, bounds.height, placement, rows, title, footer]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute z-50 min-w-[8rem] whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-md',
        position ? 'visible' : 'invisible',
        className,
      )}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, maxWidth: Math.max(160, bounds.width) }}
    >
      {title && <p className="mb-1.5 truncate font-medium text-slate-500">{title}</p>}
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
        {rows.map((row, index) => (
          <TooltipRow key={`${row.label}-${index}`} row={row} />
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t border-line pt-1.5 text-slate-600">{footer}</div>}
    </div>
  );
}

function TooltipRow({ row }: { row: ChartTooltipRow }) {
  return (
    <>
      <span aria-hidden="true" className="flex w-3 items-center justify-center">
        {row.color &&
          (row.marker === 'square' ? (
            <span className="size-2 rounded-[2px]" style={{ backgroundColor: row.color }} />
          ) : (
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: row.color }} />
          ))}
      </span>
      <span
        className={cx(
          'text-right text-sm font-semibold tabular-nums text-slate-900',
          row.active === false && 'font-medium text-slate-600',
        )}
      >
        {row.value}
      </span>
      <span className={cx('truncate text-slate-600', row.active && 'font-medium text-slate-900')}>
        {row.label}
      </span>
    </>
  );
}
