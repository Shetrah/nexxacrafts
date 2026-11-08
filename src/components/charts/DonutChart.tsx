import { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { ChartFrame } from './ChartFrame';
import { ChartLegend } from './ChartLegend';
import { formatNumber, formatShare, toNumber } from './format';
import { ringSegmentPath } from './geometry';
import { ALL_PAIRS_SAFE_SLOTS, MAX_CATEGORICAL, NEUTRAL, seriesColor } from './palette';
import type { ChartTableMode, ValueFormatter } from './types';
import { useChartInteraction } from './useChartInteraction';
import { cx } from './cx';

/** One part of the whole. */
export interface DonutDatum {
  label: string;
  value: number;
  /** Colour override; defaults to the categorical slot at the item's index in `data`. */
  color?: string;
}

/** Props for {@link DonutChart}. */
export interface DonutChartProps {
  /** Parts in a fixed entity order (colour follows the entity, never its rank). */
  data: DonutDatum[];
  /** Small label under the centre figure. Default "Total". */
  centerLabel?: string;
  /** Centre figure. Defaults to the formatted total. */
  centerValue?: string;
  /** Formats values in the legend, tooltip, table and accessible summary. */
  valueFormatter?: ValueFormatter;
  /** Chart name, e.g. "Orders by payment method". Leads the accessible summary. */
  ariaLabel: string;
  /**
   * Most slices drawn, "Other" included (2–8, default 6). Beyond it the smallest parts fold
   * into "Other". Six keeps every possible neighbour pair CVD-safe (validated all-pairs).
   */
  maxSlices?: number;
  /** Outer diameter of the ring in px. Default 168. */
  size?: number;
  emptyLabel?: string;
  emptyDescription?: string;
  tableMode?: ChartTableMode;
  loading?: boolean;
  className?: string;
}

interface Slice {
  label: string;
  value: number;
  share: number;
  color: string;
  other: boolean;
  start: number;
  end: number;
}

interface DonutModel {
  slices: Slice[];
  total: number;
  isEmpty: boolean;
}

function buildModel(data: DonutDatum[], maxSlices: number): DonutModel {
  const items = data.map((item, index) => ({
    label: item.label,
    value: Math.max(0, toNumber(item.value)),
    color: item.color,
    index,
  }));
  const positive = items.filter((item) => item.value > 0);
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  if (positive.length === 0 || total <= 0) return { slices: [], total: 0, isEmpty: true };

  const limit = Math.min(Math.max(2, Math.floor(maxSlices)), MAX_CATEGORICAL);
  // A part without an explicit colour past the eighth slot never gets a generated hue.
  const colourable = (item: (typeof items)[number]) =>
    item.color !== undefined || item.index < MAX_CATEGORICAL;
  let kept = positive;
  let folded: typeof positive = [];
  if (positive.length > limit || !positive.every(colourable)) {
    const ranked = positive
      .filter(colourable)
      .sort((a, b) => b.value - a.value || a.index - b.index)
      .slice(0, positive.length > limit ? limit - 1 : limit);
    const keep = new Set(ranked.map((item) => item.index));
    kept = positive.filter((item) => keep.has(item.index));
    folded = positive.filter((item) => !keep.has(item.index));
  }

  const parts = kept.map((item) => ({
    label: item.label,
    value: item.value,
    color: item.color ?? seriesColor(item.index),
    other: false,
  }));
  if (folded.length > 0) {
    parts.push({
      label: folded.length === 1 ? folded[0].label : 'Other',
      value: folded.reduce((sum, item) => sum + item.value, 0),
      color: NEUTRAL.other,
      other: true,
    });
  }

  let angle = 0;
  const slices = parts.map((part) => {
    const share = part.value / total;
    const start = angle;
    angle += share * Math.PI * 2;
    return { ...part, share, start, end: angle };
  });
  return { slices, total, isEmpty: false };
}

/**
 * Part-to-whole at a glance for a handful of parts (≤ 6 by default; the smallest fold into
 * "Other"). Slices start at 12 o'clock in data order with 2px surface gaps; the legend lists each
 * part with its value and share, so nothing is gated behind hover. Hovering a slice — or focusing
 * a legend row — highlights it and swaps the centre figure for that part.
 *
 * To compare close values or rank many parts, prefer {@link BarList}; for one whole split into
 * parts beside other content, prefer {@link StackedBar}.
 */
export function DonutChart({
  data,
  centerLabel = 'Total',
  centerValue,
  valueFormatter = formatNumber,
  ariaLabel,
  maxSlices = ALL_PAIRS_SAFE_SLOTS,
  size = 168,
  emptyLabel = 'No data yet',
  emptyDescription,
  tableMode = 'toggle',
  loading = false,
  className,
}: DonutChartProps) {
  const model = useMemo(() => buildModel(data, maxSlices), [data, maxSlices]);
  const interaction = useChartInteraction(model.slices.length);

  const table = useMemo(() => {
    const total = model.total;
    return {
      columns: [
        { key: 'label', label: 'Part' },
        { key: 'value', label: 'Value', numeric: true },
        { key: 'share', label: 'Share', numeric: true },
      ],
      rows: data.map((item) => {
        const value = Math.max(0, toNumber(item.value));
        return {
          label: item.label,
          value: valueFormatter(value),
          share: total > 0 ? formatShare(value / total) : '0%',
        };
      }),
    };
  }, [data, model.total, valueFormatter]);

  const summary = useMemo(() => {
    if (model.isEmpty) return `${ariaLabel}. No data.`;
    const parts = model.slices.map(
      (slice) => `${slice.label} ${valueFormatter(slice.value)} (${formatShare(slice.share)})`,
    );
    return `${ariaLabel}. Donut chart, ${model.slices.length} parts, total ${valueFormatter(model.total)}: ${parts.join(', ')}.`;
  }, [ariaLabel, model, valueFormatter]);

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      height={size}
      autoHeight
      isEmpty={model.isEmpty}
      emptyLabel={emptyLabel}
      emptyDescription={emptyDescription}
      emptyIcon={PieChart}
      table={table}
      tableMode={tableMode}
      loading={loading}
      className={className}
    >
      {(width) => {
        const diameter = Math.max(64, Math.min(size, width));
        const stacked = width < diameter + 220;
        const outer = diameter / 2;
        const thickness = Math.max(12, Math.round(diameter * 0.12));
        const inner = outer - thickness;
        const active = interaction.activeIndex;
        const activeSlice = active !== null ? model.slices[active] : null;
        return (
          <div className={cx('flex w-full gap-6', stacked ? 'flex-col items-center' : 'items-center')}>
            <div className="relative shrink-0" style={{ width: diameter, height: diameter }}>
              <svg
                role="img"
                aria-label={summary}
                width={diameter}
                height={diameter}
                viewBox={`0 0 ${diameter} ${diameter}`}
                className="block"
              >
                {model.slices.map((slice, index) => (
                  <path
                    key={`${slice.label}-${index}`}
                    d={ringSegmentPath(
                      outer,
                      outer,
                      outer,
                      inner,
                      slice.start,
                      slice.end,
                      model.slices.length > 1 ? 2 : 0,
                    )}
                    fill={slice.color}
                    fillRule="evenodd"
                    className={cx(
                      'transition-opacity duration-150 ease-out',
                      active !== null && active !== index && 'opacity-35',
                    )}
                    {...interaction.getHoverProps(index)}
                  />
                ))}
              </svg>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
                style={{ padding: thickness + 8 }}
              >
                <span className="max-w-full truncate text-xl font-semibold leading-tight text-slate-900">
                  {activeSlice
                    ? valueFormatter(activeSlice.value)
                    : (centerValue ?? valueFormatter(model.total))}
                </span>
                <span className="mt-0.5 max-w-full truncate text-xs text-slate-500">
                  {activeSlice ? `${activeSlice.label} · ${formatShare(activeSlice.share)}` : centerLabel}
                </span>
              </div>
            </div>
            <ChartLegend
              layout="list"
              ariaLabel={`${ariaLabel} legend`}
              className={stacked ? 'max-w-sm' : 'min-w-0 max-w-sm flex-1'}
              activeIndex={active}
              getItemProps={interaction.getTargetProps}
              onPointerLeave={interaction.layerProps.onPointerLeave}
              items={model.slices.map((slice) => ({
                label: slice.label,
                color: slice.color,
                value: valueFormatter(slice.value),
                share: formatShare(slice.share),
              }))}
            />
          </div>
        );
      }}
    </ChartFrame>
  );
}
