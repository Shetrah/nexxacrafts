import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChartHorizontal } from 'lucide-react';
import { ChartEmpty } from './ChartEmpty';
import { formatNumber, toNumber } from './format';
import { CATEGORICAL, NEUTRAL } from './palette';
import type { ValueFormatter } from './types';
import { cx } from './cx';

/** One ranked row. */
export interface BarListItem {
  label: string;
  value: number;
  /** Optional in-app link (react-router path) for the whole row, e.g. a filtered list. */
  to?: string;
  /** Optional muted note printed before the value, e.g. a share (`35%`) or a count. */
  hint?: string;
}

/** Props for {@link BarList}. */
export interface BarListProps {
  items: BarListItem[];
  /** Formats each row's value. */
  valueFormatter?: ValueFormatter;
  /** Name of the list, e.g. "Orders by service". */
  ariaLabel: string;
  /**
   * Maximum rows shown, "Other" included. When there are more items, the largest `max − 1` are
   * listed and the rest are summed into a final "Other" row.
   */
  max?: number;
  /** Bar colour. Defaults to categorical slot 1 (one hue: the bars are one series). */
  color?: string;
  /** Rank largest first (default). Set `false` to keep the given order (e.g. ordered tiers). */
  sort?: boolean;
  emptyLabel?: string;
  emptyDescription?: string;
  className?: string;
}

interface Row {
  key: string;
  label: string;
  value: number;
  to?: string;
  hint?: string;
  other: boolean;
}

/**
 * Ranked horizontal bars with labels and values — the default part-to-whole form for comparing
 * parts (e.g. orders by service). Bars share one baseline and one hue, with a 4px rounded
 * data-end. Every value is printed, so the list itself is the accessible equivalent: it renders
 * as a labelled ordered list (no hidden table or tooltip needed) and rows with `to` are links.
 */
export function BarList({
  items,
  valueFormatter = formatNumber,
  ariaLabel,
  max,
  color = CATEGORICAL[0],
  sort = true,
  emptyLabel = 'No data yet',
  emptyDescription,
  className,
}: BarListProps) {
  const rows = useMemo<Row[]>(() => {
    const clean = items.map((item, index) => ({
      key: `${item.label}-${index}`,
      label: item.label,
      value: Math.max(0, toNumber(item.value)),
      to: item.to,
      hint: item.hint,
      other: false,
      index,
    }));
    const ordered = sort ? [...clean].sort((a, b) => b.value - a.value || a.index - b.index) : clean;
    const limit = max !== undefined ? Math.max(1, Math.floor(max)) : undefined;
    if (limit === undefined || ordered.length <= limit) return ordered;
    const head = ordered.slice(0, Math.max(0, limit - 1));
    const rest = ordered.slice(head.length);
    return [
      ...head,
      {
        key: '__other',
        label: `Other (${rest.length})`,
        value: rest.reduce((sum, row) => sum + row.value, 0),
        other: true,
      },
    ];
  }, [items, max, sort]);

  const top = Math.max(0, ...rows.map((row) => row.value));
  const valueWidth = Math.max(1, ...rows.map((row) => valueFormatter(row.value).length));
  if (rows.length === 0 || top <= 0) {
    return (
      <ChartEmpty
        className={className}
        label={emptyLabel}
        description={emptyDescription}
        icon={BarChartHorizontal}
        height={160}
      />
    );
  }

  return (
    <ol aria-label={ariaLabel} className={cx('w-full', className)}>
      {rows.map((row) => {
        const width = (row.value / top) * 100;
        const formatted = valueFormatter(row.value);
        // Spoken as "label: value, hint" — the visual order puts the hint before the value.
        const spoken = `${row.label}: ${formatted}${row.hint ? `, ${row.hint}` : ''}`;
        const content = (
          <>
            <span className="sr-only">{spoken}</span>
            <span aria-hidden="true" className="flex items-baseline justify-between gap-3">
              <span
                className={cx(
                  'min-w-0 truncate text-sm',
                  row.other ? 'text-slate-600' : 'text-slate-700',
                  row.to &&
                    'group-hover:text-slate-900 group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4',
                )}
                title={row.label}
              >
                {row.label}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {row.hint && <span className="text-xs tabular-nums text-slate-500">{row.hint}</span>}
                <span
                  className="text-right text-sm font-semibold tabular-nums text-slate-900"
                  style={{ minWidth: `${valueWidth}ch` }}
                >
                  {formatted}
                </span>
              </span>
            </span>
            <span aria-hidden="true" className="mt-1.5 block h-2">
              <span
                className="block h-full rounded-r-[4px]"
                style={{
                  width: `${width}%`,
                  minWidth: row.value > 0 ? 2 : 0,
                  backgroundColor: row.other ? NEUTRAL.other : color,
                }}
              />
            </span>
          </>
        );
        return (
          <li key={row.key}>
            {row.to ? (
              <Link to={row.to} className="group block rounded-md py-1.5">
                {content}
              </Link>
            ) : (
              <span className="block py-1.5">{content}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
