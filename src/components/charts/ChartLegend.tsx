import type { ChartTargetProps } from './useChartInteraction';
import { cx } from './cx';

/** One legend entry. Text stays in text tokens; the swatch beside it carries identity. */
export interface ChartLegendItem {
  label: string;
  color: string;
  /** Formatted value (list layout only), e.g. `412`. */
  value?: string;
  /** Formatted share (list layout only), e.g. `54%`. */
  share?: string;
}

/** Props for {@link ChartLegend}. */
export interface ChartLegendProps {
  items: ChartLegendItem[];
  /** Swatch mirrors the mark: `square` for bars, areas and slices; `line` for lines. */
  marker?: 'square' | 'line';
  /** `inline` wraps names in a row (series charts); `list` stacks rows with value and share. */
  layout?: 'inline' | 'list';
  /** Index of the highlighted entry (synced with the chart), or `null`. */
  activeIndex?: number | null;
  /** Optional focus/hover props per entry, so the legend can drive the chart's highlight. */
  getItemProps?: (index: number) => ChartTargetProps;
  /** Called when the pointer leaves the legend (clears a hover highlight). */
  onPointerLeave?: () => void;
  /** Accessible name for the list. */
  ariaLabel?: string;
  className?: string;
}

/** Swatch drawn beside legend text. */
export function LegendSwatch({ color, marker = 'square' }: { color: string; marker?: 'square' | 'line' }) {
  return marker === 'line' ? (
    <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
  ) : (
    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
  );
}

/**
 * Legend for any chart with two or more series (a single series needs none — the card title
 * names it). In `list` layout each row also prints its value and share, right-aligned in
 * tabular figures.
 */
export function ChartLegend({
  items,
  marker = 'square',
  layout = 'inline',
  activeIndex = null,
  getItemProps,
  onPointerLeave,
  ariaLabel = 'Legend',
  className,
}: ChartLegendProps) {
  if (layout === 'list') {
    return (
      <ul
        aria-label={ariaLabel}
        onPointerLeave={onPointerLeave}
        className={cx('w-full divide-y divide-line', className)}
      >
        {items.map((item, index) => {
          const dimmed = activeIndex !== null && activeIndex !== index;
          const label = [item.label, item.value, item.share && `(${item.share})`].filter(Boolean).join(' ');
          return (
            <li
              key={`${item.label}-${index}`}
              {...(getItemProps ? getItemProps(index) : {})}
              aria-label={getItemProps ? label : undefined}
              className={cx(
                'flex min-h-9 items-center gap-2.5 py-1.5 text-sm transition-opacity duration-150 ease-out',
                getItemProps && 'cursor-default outline-offset-[-2px]',
                dimmed && 'opacity-50',
              )}
            >
              <LegendSwatch color={item.color} marker={marker} />
              <span className="min-w-0 flex-1 truncate text-slate-700" title={item.label}>
                {item.label}
              </span>
              {item.value !== undefined && (
                <span className="font-medium tabular-nums text-slate-900">{item.value}</span>
              )}
              {item.share !== undefined && (
                <span className="w-11 text-right text-xs tabular-nums text-slate-500">{item.share}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul
      aria-label={ariaLabel}
      className={cx('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600', className)}
    >
      {items.map((item, index) => (
        <li
          key={`${item.label}-${index}`}
          className={cx(
            'flex items-center gap-1.5 transition-opacity duration-150 ease-out',
            activeIndex !== null && activeIndex !== index && 'opacity-50',
          )}
        >
          <LegendSwatch color={item.color} marker={marker} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
