import { useMemo } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import { ChartFrame } from './ChartFrame';
import { ChartHitLayer } from './ChartHitLayer';
import type { HitTarget } from './ChartHitLayer';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip } from './ChartTooltip';
import {
  axisFormatterFor,
  crisp,
  formatNumber,
  hasPlottableValues,
  linearScale,
  thinLabels,
  toNumber,
} from './format';
import { areaPath, linePath } from './geometry';
import type { Curve, Point } from './geometry';
import { CHART_CHROME, CHART_TEXT, seriesColor } from './palette';
import type { CategoryFormatter, ChartDatum, ChartSeries, ChartTableMode, ValueFormatter } from './types';
import { useChartInteraction } from './useChartInteraction';
import type { ChartInteraction } from './useChartInteraction';
import { useTextMeasure } from './useElementSize';

/** Props shared by {@link AreaChart} and {@link LineChart}. */
export interface CartesianChartProps {
  /** One row per x position (e.g. one row per day or month), in order. */
  data: ChartDatum[];
  /** Field holding the x label. */
  xKey: string;
  /** Series to plot, in fixed order (colour follows the series, never its rank). */
  series: ChartSeries[];
  /** Height of the graphic in px, including the x-axis band. Default 240. */
  height?: number;
  /** Formats values in tooltips, labels, the table and the accessible summary. */
  valueFormatter?: ValueFormatter;
  /** Formats y-axis ticks. Defaults to full numbers below 10,000 and compact (10K) above. */
  axisFormatter?: ValueFormatter;
  /** Formats x labels. */
  xFormatter?: CategoryFormatter;
  /** Header of the x column in the table view. Defaults to `xKey`. */
  xLabel?: string;
  /** Chart name, e.g. "Revenue by month". Leads the accessible summary. */
  ariaLabel: string;
  /** Empty-state message (shown when there is no data or every value is zero). */
  emptyLabel?: string;
  emptyDescription?: string;
  /** `linear` (default) or `monotone` — a smooth curve that never overshoots the data. */
  curve?: Curve;
  /** Print the last value (one series) or series names (2–4 series) at the line ends. Default true. */
  endLabels?: boolean;
  tableMode?: ChartTableMode;
  /** Hold the previous render at reduced opacity while refetching. */
  loading?: boolean;
  className?: string;
}

/** Internal props: the public charts choose the variant. */
export interface CartesianLineChartProps extends CartesianChartProps {
  variant: 'area' | 'line';
  /** Draw the ~10% area wash. Area charts fill a single series; lines never fill. */
  fill: boolean;
}

const AXIS_FONT = 11;
const LABEL_FONT = 12;
const X_AXIS_BAND = 28;
const PLOT_TOP = 10;
const MARKER_RADIUS = 4;
const MARKER_RING = 2;
const MIN_LABEL_GAP = 14;

interface LineModel {
  categories: string[];
  values: number[][];
  colors: string[];
  isEmpty: boolean;
  integer: boolean;
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/^\w/, (char) => char.toUpperCase());
}

/**
 * Shared implementation of the area and line charts: 2px lines with round joins, a hairline
 * crosshair that snaps to the nearest x, one tooltip listing every series, ringed markers, x-label
 * thinning, and direct end labels when they fit without colliding.
 */
export function CartesianLineChart({
  data,
  xKey,
  series,
  height = 240,
  valueFormatter = formatNumber,
  axisFormatter,
  xFormatter,
  xLabel,
  ariaLabel,
  emptyLabel = 'No data yet',
  emptyDescription,
  curve = 'linear',
  endLabels = true,
  tableMode = 'toggle',
  loading = false,
  className,
  variant,
  fill,
}: CartesianLineChartProps) {
  const model = useMemo<LineModel>(() => {
    const categories = data.map((row) => {
      const raw = row[xKey] ?? '';
      return xFormatter ? xFormatter(raw) : String(raw);
    });
    const values = series.map((item) => data.map((row) => toNumber(row[item.key])));
    const flat = values.flat();
    return {
      categories,
      values,
      colors: series.map((item, index) => item.color ?? seriesColor(index)),
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
    ];
    const rows = model.categories.map((category, rowIndex) => {
      const row: Record<string, string> = { __category: category };
      series.forEach((item, seriesIndex) => {
        row[`s:${item.key}`] = valueFormatter(model.values[seriesIndex][rowIndex]);
      });
      return row;
    });
    return { columns, rows };
  }, [model, series, valueFormatter, xKey, xLabel]);

  const summary = useMemo(
    () => describeLines(ariaLabel, variant, model, series, valueFormatter),
    [ariaLabel, variant, model, series, valueFormatter],
  );

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      height={height}
      isEmpty={model.isEmpty}
      emptyLabel={emptyLabel}
      emptyDescription={emptyDescription}
      emptyIcon={LineChartIcon}
      legend={
        multi ? (
          <ChartLegend
            marker={fill ? 'square' : 'line'}
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
        <LinePlot
          width={width}
          height={height}
          model={model}
          series={series}
          fill={fill}
          curve={curve}
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

interface LinePlotProps {
  width: number;
  height: number;
  model: LineModel;
  series: ChartSeries[];
  fill: boolean;
  curve: Curve;
  endLabels: boolean;
  valueFormatter: ValueFormatter;
  axisFormatter?: ValueFormatter;
  summary: string;
  ariaLabel: string;
  interaction: ChartInteraction;
}

interface EndLabel {
  text: string;
  y: number;
}

function LinePlot({
  width,
  height,
  model,
  series,
  fill,
  curve,
  endLabels,
  valueFormatter,
  axisFormatter,
  summary,
  ariaLabel,
  interaction,
}: LinePlotProps) {
  const measure = useTextMeasure();
  const { categories, values, colors } = model;
  const count = categories.length;

  const layout = useMemo(() => {
    const plotBottom = height - X_AXIS_BAND;
    const flat = values.flat();
    const tickCount = Math.max(2, Math.floor((plotBottom - PLOT_TOP) / 44));
    const scale = linearScale(
      Math.min(0, ...flat),
      Math.max(0, ...flat),
      plotBottom,
      PLOT_TOP,
      tickCount,
      model.integer,
    );
    const formatTick = axisFormatter ?? axisFormatterFor(Math.max(Math.abs(scale.min), Math.abs(scale.max)));
    const tickLabels = scale.ticks.map(formatTick);
    const plotLeft = Math.ceil(Math.max(...tickLabels.map((label) => measure(label, AXIS_FONT)))) + 10;
    const edge = MARKER_RADIUS + MARKER_RING;
    const widestX = Math.max(...categories.map((label) => measure(label, AXIS_FONT)));

    // Direct end labels: the last value for one series, series names for 2–4 series.
    const lastIndex = count - 1;
    let labels: EndLabel[] = [];
    let labelSpace = 0;
    if (endLabels && series.length <= 4 && count > 0) {
      const texts = series.map((item, index) =>
        series.length === 1 ? valueFormatter(values[index][lastIndex]) : item.label,
      );
      // Marker radius + ring + 6px gap before the text, and 2px of air after it.
      labelSpace = Math.ceil(Math.max(...texts.map((text) => measure(text, LABEL_FONT, 500)))) + 14;
      const plotWidthWithLabels = width - plotLeft - edge - labelSpace;
      const ys = values.map((row) => scale.map(row[lastIndex]));
      const sorted = [...ys].sort((a, b) => a - b);
      const collide = sorted.some((y, index) => index > 0 && y - sorted[index - 1] < MIN_LABEL_GAP);
      if (plotWidthWithLabels >= 280 && !collide) {
        labels = texts.map((text, index) => ({ text, y: ys[index] }));
      } else {
        labelSpace = 0;
      }
    }

    const left = plotLeft + edge;
    const right = width - Math.max(edge, labelSpace ? labelSpace : Math.min(widestX / 2, 32));
    const step = count > 1 ? (right - left) / (count - 1) : 0;
    const xs = categories.map((_, index) => (count > 1 ? left + index * step : (left + right) / 2));
    const points: Point[][] = values.map((row) =>
      row.map((value, index) => [xs[index], scale.map(value)] as const),
    );
    const baseline = scale.map(0);

    const spacing = count > 1 ? step : right - left;
    const shown = thinLabels(categories, spacing, AXIS_FONT, measure);
    return {
      scale,
      tickLabels,
      plotLeft,
      plotRight: width - (labelSpace ? labelSpace - 4 : 2),
      plotBottom,
      xs,
      points,
      baseline,
      shown,
      labels,
    };
  }, [
    width,
    height,
    values,
    categories,
    count,
    series,
    endLabels,
    valueFormatter,
    axisFormatter,
    model.integer,
    measure,
  ]);

  const active = interaction.activeIndex;
  const targets: HitTarget[] = layout.xs.map((x, index) => {
    const previous = index > 0 ? (layout.xs[index - 1] + x) / 2 : layout.plotLeft;
    const next = index < count - 1 ? (x + layout.xs[index + 1]) / 2 : layout.plotRight;
    return {
      left: previous,
      top: 0,
      width: Math.max(1, next - previous),
      height,
      label: `${categories[index]}: ${series
        .map((item, seriesIndex) => `${item.label} ${valueFormatter(values[seriesIndex][index])}`)
        .join(', ')}`,
    };
  });

  const lastIndex = count - 1;
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
        {layout.scale.ticks.map((tick) => (
          <line
            key={`grid-${tick}`}
            x1={layout.plotLeft}
            x2={layout.plotRight}
            y1={crisp(layout.scale.map(tick))}
            y2={crisp(layout.scale.map(tick))}
            stroke={tick === 0 ? CHART_CHROME.axis : CHART_CHROME.grid}
            strokeWidth={1}
          />
        ))}
        {fill &&
          layout.points.map((points, index) => (
            <path
              key={`area-${series[index].key}`}
              d={areaPath(points, layout.baseline, curve)}
              fill={colors[index]}
              fillOpacity={0.1}
            />
          ))}
        {active !== null && (
          <line
            x1={crisp(layout.xs[active])}
            x2={crisp(layout.xs[active])}
            y1={PLOT_TOP - 4}
            y2={layout.plotBottom}
            stroke={CHART_CHROME.crosshair}
            strokeWidth={1}
          />
        )}
        {layout.points.map((points, index) => (
          <path
            key={`line-${series[index].key}`}
            d={linePath(points, curve)}
            fill="none"
            stroke={colors[index]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {layout.points.map((points, index) => {
          // End-dots anchor the direct labels; the hovered x gets its own ringed markers.
          const indices = active !== null && active !== lastIndex ? [lastIndex, active] : [lastIndex];
          return indices.map((pointIndex) => {
            const point = points[pointIndex];
            if (!point) return null;
            return (
              <circle
                key={`marker-${series[index].key}-${pointIndex}`}
                cx={point[0]}
                cy={point[1]}
                r={MARKER_RADIUS}
                fill={colors[index]}
                stroke={CHART_CHROME.surface}
                strokeWidth={MARKER_RING}
              />
            );
          });
        })}
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
          {categories.map((label, index) =>
            layout.shown.has(index) ? (
              <text key={`x-${index}`} x={layout.xs[index]} y={layout.plotBottom + 18} textAnchor="middle">
                {label}
              </text>
            ) : null,
          )}
        </g>
        {layout.labels.length > 0 && (
          <g fontSize={LABEL_FONT} fontWeight={500} className="tabular-nums">
            {layout.labels.map((label, index) => (
              <text
                key={`end-${series[index].key}`}
                x={layout.xs[lastIndex] + MARKER_RADIUS + MARKER_RING + 6}
                y={label.y}
                dominantBaseline="middle"
                fill={series.length === 1 ? CHART_TEXT.primary : CHART_TEXT.secondary}
              >
                {label.text}
              </text>
            ))}
          </g>
        )}
      </svg>
      <ChartHitLayer
        targets={targets}
        ariaLabel={`${ariaLabel}: ${count} ${count === 1 ? 'point' : 'points'}. Use the arrow keys to move along the line.`}
        interaction={interaction}
      />
      {active !== null && (
        <ChartTooltip
          x={layout.xs[active]}
          y={Math.min(...layout.points.map((points) => points[active][1]))}
          bounds={{ width, height }}
          title={categories[active]}
          rows={series.map((item, index) => ({
            label: item.label,
            value: valueFormatter(values[index][active]),
            color: colors[index],
            marker: 'line',
          }))}
        />
      )}
    </>
  );
}

function describeLines(
  name: string,
  variant: 'area' | 'line',
  model: LineModel,
  series: ChartSeries[],
  format: ValueFormatter,
): string {
  const { categories, values } = model;
  const count = categories.length;
  if (count === 0) return `${name}. No data.`;
  const kind = variant === 'area' ? 'Area chart' : 'Line chart';
  const span = count === 1 ? categories[0] : `${categories[0]} to ${categories[count - 1]}`;
  const parts = [`${name}. ${kind}, ${count} ${count === 1 ? 'point' : 'points'}: ${span}.`];
  series.forEach((item, index) => {
    const row = values[index];
    const high = row.indexOf(Math.max(...row));
    const low = row.indexOf(Math.min(...row));
    parts.push(
      `${item.label}: ${format(row[0])} to ${format(row[count - 1])}; high ${format(row[high])} (${
        categories[high]
      }), low ${format(row[low])} (${categories[low]}).`,
    );
  });
  return parts.join(' ');
}
