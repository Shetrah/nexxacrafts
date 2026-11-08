import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { ChartFrame } from './ChartFrame';
import { ChartHitLayer } from './ChartHitLayer';
import type { HitTarget } from './ChartHitLayer';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip } from './ChartTooltip';
import type { ChartTooltipRow } from './ChartTooltip';
import {
  axisFormatterFor,
  clamp,
  crisp,
  formatNumber,
  hasPlottableValues,
  linearScale,
  thinLabels,
  toNumber,
} from './format';
import { columnPath } from './geometry';
import { CHART_CHROME, CHART_TEXT, seriesColor } from './palette';
import type { CategoryFormatter, ChartDatum, ChartSeries, ChartTableMode, ValueFormatter } from './types';
import { useChartInteraction } from './useChartInteraction';
import type { ChartInteraction } from './useChartInteraction';
import { useTextMeasure } from './useElementSize';

/** Props for {@link BarChart}. */
export interface BarChartProps {
  /** One row per category, in display order (e.g. one row per week). */
  data: ChartDatum[];
  /** Field holding the category label. */
  xKey: string;
  /** Series to plot, in fixed order (colour follows the series, never its rank). */
  series: ChartSeries[];
  /**
   * Stack series on one bar per category instead of grouping them side by side. Stacks expect
   * non-negative values (negatives are drawn as zero; use grouped bars for signed data).
   */
  stacked?: boolean;
  /** Height of the graphic in px, including the x-axis band. Default 240. */
  height?: number;
  /** Formats values in tooltips, the table and the accessible summary. */
  valueFormatter?: ValueFormatter;
  /** Formats y-axis ticks. Defaults to full numbers below 10,000 and compact (10K) above. */
  axisFormatter?: ValueFormatter;
  /** Formats category labels. */
  xFormatter?: CategoryFormatter;
  /** Header of the category column in the table view. Defaults to `xKey`. */
  xLabel?: string;
  /**
   * Name 2–4 stacked series beside the last stack when the names fit without colliding
   * (direct labels supplement the legend). Default true.
   */
  endLabels?: boolean;
  /** Chart name, e.g. "Orders per week". Leads the accessible summary. */
  ariaLabel: string;
  /** Empty-state message (shown when there is no data or every value is zero). */
  emptyLabel?: string;
  emptyDescription?: string;
  tableMode?: ChartTableMode;
  /** Hold the previous render at reduced opacity while refetching. */
  loading?: boolean;
  className?: string;
}

const AXIS_FONT = 11;
const LABEL_FONT = 12;
const MIN_LABEL_GAP = 14;
const X_AXIS_BAND = 28;
const PLOT_TOP = 8;
const MAX_BAR = 24;
const GAP = 2;

interface BarModel {
  categories: string[];
  values: number[][];
  colors: string[];
  totals: number[];
  isEmpty: boolean;
  integer: boolean;
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/^\w/, (char) => char.toUpperCase());
}

/**
 * Vertical bars over categories (e.g. orders per week), grouped or stacked.
 *
 * Marks follow the dataviz spec: bars ≤ 24px with a 4px rounded data-end and a square baseline,
 * 2px surface gaps between touching bars and stacked segments, hairline recessive grid. Each
 * category column is one hover/focus target (Arrow keys move between them) with a tooltip that
 * lists every series; a legend appears for two or more series; the "Table" toggle shows every
 * value. Empty or all-zero data renders an empty state, never placeholder bars.
 *
 * @example
 * <BarChart ariaLabel="Orders per week" data={weeks} xKey="week"
 *   series={[{ key: 'orders', label: 'Orders' }]} />
 */
export function BarChart({
  data,
  xKey,
  series,
  stacked = false,
  height = 240,
  valueFormatter = formatNumber,
  axisFormatter,
  xFormatter,
  xLabel,
  endLabels = true,
  ariaLabel,
  emptyLabel = 'No data yet',
  emptyDescription,
  tableMode = 'toggle',
  loading = false,
  className,
}: BarChartProps) {
  const model = useMemo<BarModel>(() => {
    const categories = data.map((row) => {
      const raw = row[xKey] ?? '';
      return xFormatter ? xFormatter(raw) : String(raw);
    });
    const values = data.map((row) => series.map((item) => toNumber(row[item.key])));
    const flat = values.flat();
    return {
      categories,
      values,
      colors: series.map((item, index) => item.color ?? seriesColor(index)),
      totals: values.map((row) => row.reduce((sum, value) => sum + Math.max(0, value), 0)),
      isEmpty: data.length === 0 || series.length === 0 || !hasPlottableValues(flat),
      integer: flat.every((value) => Number.isInteger(value)),
    };
  }, [data, series, xKey, xFormatter]);

  const interaction = useChartInteraction(model.categories.length);
  const multi = series.length > 1;

  const table = useMemo(() => {
    const columns = [
      { key: '__category', label: xLabel ?? titleCase(xKey) },
      ...series.map((item) => ({ key: `s:${item.key}`, label: item.label, numeric: true })),
      ...(stacked && multi ? [{ key: '__total', label: 'Total', numeric: true }] : []),
    ];
    const rows = model.categories.map((category, rowIndex) => {
      const row: Record<string, string> = { __category: category };
      series.forEach((item, seriesIndex) => {
        row[`s:${item.key}`] = valueFormatter(model.values[rowIndex][seriesIndex]);
      });
      if (stacked && multi) row.__total = valueFormatter(model.totals[rowIndex]);
      return row;
    });
    return { columns, rows };
  }, [model, series, stacked, multi, valueFormatter, xKey, xLabel]);

  const summary = useMemo(
    () => describeBars(ariaLabel, model, series, stacked, valueFormatter),
    [ariaLabel, model, series, stacked, valueFormatter],
  );

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      height={height}
      isEmpty={model.isEmpty}
      emptyLabel={emptyLabel}
      emptyDescription={emptyDescription}
      emptyIcon={BarChart3}
      legend={
        multi ? (
          <ChartLegend
            items={series.map((item, index) => ({ label: item.label, color: model.colors[index] }))}
          />
        ) : undefined
      }
      table={table}
      tableMode={tableMode}
      loading={loading}
      className={className}
    >
      {(width) => (
        <BarPlot
          width={width}
          height={height}
          model={model}
          series={series}
          stacked={stacked}
          endLabels={endLabels}
          valueFormatter={valueFormatter}
          axisFormatter={axisFormatter}
          summary={summary}
          ariaLabel={ariaLabel}
          interaction={interaction}
        />
      )}
    </ChartFrame>
  );
}

interface BarPlotProps {
  width: number;
  height: number;
  model: BarModel;
  series: ChartSeries[];
  stacked: boolean;
  endLabels: boolean;
  valueFormatter: ValueFormatter;
  axisFormatter?: ValueFormatter;
  summary: string;
  ariaLabel: string;
  interaction: ChartInteraction;
}

interface BarMark {
  key: string;
  d: string;
  color: string;
}

function BarPlot({
  width,
  height,
  model,
  series,
  stacked,
  endLabels,
  valueFormatter,
  axisFormatter,
  summary,
  ariaLabel,
  interaction,
}: BarPlotProps) {
  const measure = useTextMeasure();
  const { categories, values, colors, totals } = model;
  const count = categories.length;
  const seriesCount = series.length;

  const layout = useMemo(() => {
    const plotBottom = height - X_AXIS_BAND;
    // One series is never "stacked": it draws signed bars from the zero baseline.
    const stacking = stacked && seriesCount > 1;
    let low = 0;
    let high = 0;
    if (stacking) {
      high = Math.max(0, ...totals);
    } else {
      for (const value of values.flat()) {
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
    const tickCount = Math.max(2, Math.floor((plotBottom - PLOT_TOP) / 44));
    const scale = linearScale(low, high, plotBottom, PLOT_TOP, tickCount, model.integer);
    const formatTick = axisFormatter ?? axisFormatterFor(Math.max(Math.abs(scale.min), Math.abs(scale.max)));
    const tickLabels = scale.ticks.map(formatTick);
    const plotLeft = Math.ceil(Math.max(...tickLabels.map((label) => measure(label, AXIS_FONT)))) + 10;
    const baseline = scale.map(0);

    // Direct labels: name each stacked series beside the last stack when every name fits.
    let labelSpace = 0;
    let labels: Array<{ text: string; y: number }> = [];
    if (endLabels && stacking && seriesCount <= 4 && count > 0) {
      const last = values[count - 1];
      if (last.every((value) => value > 0)) {
        let cumulative = 0;
        const centers = last.map((value) => {
          const bottom = scale.map(cumulative);
          cumulative += value;
          return (bottom + scale.map(cumulative)) / 2;
        });
        const sorted = [...centers].sort((a, b) => a - b);
        const collide = sorted.some((y, index) => index > 0 && y - sorted[index - 1] < MIN_LABEL_GAP);
        const space = Math.ceil(Math.max(...series.map((item) => measure(item.label, LABEL_FONT, 500)))) + 10;
        if (!collide && width - plotLeft - space >= 320) {
          labelSpace = space;
          labels = series.map((item, index) => ({ text: item.label, y: centers[index] }));
        }
      }
    }

    const plotRight = width - 2 - labelSpace;
    const band = Math.max(1, (plotRight - plotLeft) / Math.max(1, count));

    const grouped = !stacking && seriesCount > 1;
    let barWidth: number;
    let groupWidth: number;
    if (grouped) {
      groupWidth = Math.min(band * 0.78, seriesCount * MAX_BAR + (seriesCount - 1) * GAP);
      barWidth = Math.max(1, (groupWidth - (seriesCount - 1) * GAP) / seriesCount);
    } else {
      barWidth = band >= 8 ? clamp(band * 0.62, 2, MAX_BAR) : Math.max(1, band - GAP);
      groupWidth = barWidth;
    }

    const bars: BarMark[] = [];
    const anchors: number[] = [];
    for (let row = 0; row < count; row += 1) {
      const bandStart = plotLeft + row * band;
      let top = baseline;
      if (!stacking) {
        const start = bandStart + (band - groupWidth) / 2;
        values[row].forEach((value, column) => {
          if (value === 0) return;
          const end = scale.map(value);
          top = Math.min(top, end);
          bars.push({
            key: `${row}-${column}`,
            d: columnPath(start + column * (barWidth + GAP), barWidth, baseline, end),
            color: colors[column],
          });
        });
      } else {
        const x = bandStart + (band - barWidth) / 2;
        const visible = values[row]
          .map((value, column) => ({ value: Math.max(0, value), column }))
          .filter((item) => item.value > 0);
        let cumulative = 0;
        visible.forEach((item, position) => {
          let bottom = scale.map(cumulative);
          cumulative += item.value;
          let end = scale.map(cumulative);
          // 2px surface gap between stacked segments: 1px from each side of every inner boundary.
          if (position > 0) bottom -= GAP / 2;
          const isTop = position === visible.length - 1;
          if (!isTop) end += GAP / 2;
          if (bottom - end < 0.5) return;
          top = Math.min(top, end);
          bars.push({
            key: `${row}-${item.column}`,
            d: columnPath(x, barWidth, bottom, end, isTop ? 4 : 0),
            color: colors[item.column],
          });
        });
      }
      anchors.push(top);
    }

    const shownLabels = thinLabels(categories, band, AXIS_FONT, measure);
    const xLabels = categories.map((label, index) => {
      const half = measure(label, AXIS_FONT) / 2;
      const center = plotLeft + index * band + band / 2;
      return { label, x: clamp(center, half + 1, width - half - 1), shown: shownLabels.has(index) };
    });

    const labelX = plotLeft + (count - 1) * band + (band + barWidth) / 2 + 8;
    return {
      scale,
      tickLabels,
      plotLeft,
      plotRight,
      plotBottom,
      band,
      bars,
      anchors,
      xLabels,
      baseline,
      labels,
      labelX,
    };
  }, [
    width,
    height,
    values,
    totals,
    colors,
    categories,
    count,
    series,
    stacked,
    endLabels,
    seriesCount,
    axisFormatter,
    model.integer,
    measure,
  ]);

  const targets: HitTarget[] = categories.map((category, row) => ({
    left: layout.plotLeft + row * layout.band,
    top: 0,
    width: layout.band,
    height,
    label: describeCategory(category, row, model, series, stacked, valueFormatter),
  }));

  const active = interaction.activeIndex;
  const tooltipRows: ChartTooltipRow[] =
    active === null
      ? []
      : series.map((item, column) => ({
          label: item.label,
          value: valueFormatter(values[active][column]),
          color: colors[column],
        }));

  return (
    <>
      <svg
        role="img"
        aria-label={summary}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block select-none overflow-visible"
      >
        {active !== null && (
          <rect
            x={layout.plotLeft + active * layout.band + 1}
            y={PLOT_TOP - 4}
            width={Math.max(0, layout.band - 2)}
            height={layout.plotBottom - PLOT_TOP + 4}
            rx={4}
            fill={CHART_CHROME.hoverBand}
          />
        )}
        {layout.scale.ticks.map((tick) =>
          tick === 0 ? null : (
            <line
              key={`grid-${tick}`}
              x1={layout.plotLeft}
              x2={layout.plotRight}
              y1={crisp(layout.scale.map(tick))}
              y2={crisp(layout.scale.map(tick))}
              stroke={CHART_CHROME.grid}
              strokeWidth={1}
            />
          ),
        )}
        {layout.bars.map((bar) => (
          <path key={bar.key} d={bar.d} fill={bar.color} />
        ))}
        <line
          x1={layout.plotLeft}
          x2={layout.plotRight}
          y1={crisp(layout.baseline)}
          y2={crisp(layout.baseline)}
          stroke={CHART_CHROME.axis}
          strokeWidth={1}
        />
        {layout.labels.length > 0 && (
          <g fontSize={LABEL_FONT} fontWeight={500} fill={CHART_TEXT.secondary}>
            {layout.labels.map((label) => (
              <text key={`end-${label.text}`} x={layout.labelX} y={label.y} dominantBaseline="middle">
                {label.text}
              </text>
            ))}
          </g>
        )}
        <g fontSize={AXIS_FONT} fill={CHART_TEXT.muted} className="tabular-nums">
          {layout.scale.ticks.map((tick, index) => (
            <text
              key={`tick-${tick}`}
              x={layout.plotLeft - 8}
              y={layout.scale.map(tick)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {layout.tickLabels[index]}
            </text>
          ))}
          {layout.xLabels.map((label, index) =>
            label.shown ? (
              <text key={`x-${index}`} x={label.x} y={layout.plotBottom + 18} textAnchor="middle">
                {label.label}
              </text>
            ) : null,
          )}
        </g>
      </svg>
      <ChartHitLayer
        targets={targets}
        ariaLabel={`${ariaLabel}: ${count} ${count === 1 ? 'bar' : 'bars'}. Use the arrow keys to move between bars.`}
        interaction={interaction}
      />
      {active !== null && (
        <ChartTooltip
          x={layout.plotLeft + active * layout.band + layout.band / 2}
          y={layout.anchors[active]}
          bounds={{ width, height }}
          title={categories[active]}
          rows={tooltipRows}
          footer={
            stacked && seriesCount > 1 ? (
              <span className="flex justify-between gap-4">
                <span>Total</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {valueFormatter(totals[active])}
                </span>
              </span>
            ) : undefined
          }
        />
      )}
    </>
  );
}

function describeCategory(
  category: string,
  row: number,
  model: BarModel,
  series: ChartSeries[],
  stacked: boolean,
  format: ValueFormatter,
): string {
  const parts = series.map((item, column) => `${item.label} ${format(model.values[row][column])}`);
  if (stacked && series.length > 1) parts.push(`total ${format(model.totals[row])}`);
  return `${category}: ${parts.join(', ')}`;
}

function describeBars(
  name: string,
  model: BarModel,
  series: ChartSeries[],
  stacked: boolean,
  format: ValueFormatter,
): string {
  const { categories, values, totals } = model;
  const count = categories.length;
  if (count === 0) return `${name}. No data.`;
  const span = count === 1 ? categories[0] : `${categories[0]} to ${categories[count - 1]}`;
  const kind = stacked && series.length > 1 ? 'Stacked bar chart' : 'Bar chart';
  const parts = [`${name}. ${kind}, ${count} ${count === 1 ? 'category' : 'categories'}: ${span}.`];
  if (series.length > 1) parts.push(`Series: ${series.map((item) => item.label).join(', ')}.`);
  if (stacked || series.length === 1) {
    const sums = series.length === 1 ? values.map((row) => row[0]) : totals;
    const peak = sums.indexOf(Math.max(...sums));
    parts.push(`Highest: ${categories[peak]}, ${format(sums[peak])}.`);
    parts.push(`Total ${format(sums.reduce((sum, value) => sum + value, 0))}.`);
  } else {
    series.forEach((item, column) => {
      const columnValues = values.map((row) => row[column]);
      const peak = columnValues.indexOf(Math.max(...columnValues));
      parts.push(`${item.label} highest: ${categories[peak]}, ${format(columnValues[peak])}.`);
    });
  }
  return parts.join(' ');
}
