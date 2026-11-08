/**
 * NexxaCraft chart library — dependency-free SVG charts for the staff dashboards.
 *
 * Every chart is responsive (ResizeObserver), exposes a `role="img"` summary plus a data-table
 * twin, shows a clean empty state for empty or all-zero data, and takes its colours from the
 * validated palette in `./palette`. See docs/DESIGN_SYSTEM.md § Charts.
 */
export { BarChart } from './BarChart';
export type { BarChartProps } from './BarChart';
export { AreaChart } from './AreaChart';
export type { AreaChartProps } from './AreaChart';
export { LineChart } from './LineChart';
export type { LineChartProps } from './LineChart';
export type { CartesianChartProps } from './CartesianLineChart';
export { DonutChart } from './DonutChart';
export type { DonutChartProps, DonutDatum } from './DonutChart';
export { BarList } from './BarList';
export type { BarListItem, BarListProps } from './BarList';
export { StackedBar } from './StackedBar';
export type { StackedBarProps, StackedBarSegment } from './StackedBar';
export { Sparkline } from './Sparkline';
export type { SparklineProps } from './Sparkline';

export { ChartLegend, LegendSwatch } from './ChartLegend';
export type { ChartLegendItem, ChartLegendProps } from './ChartLegend';
export { ChartTooltip } from './ChartTooltip';
export type { ChartTooltipProps, ChartTooltipRow } from './ChartTooltip';
export { ChartEmpty } from './ChartEmpty';
export type { ChartEmptyProps } from './ChartEmpty';
export { ChartTable } from './ChartTable';
export type { ChartTableColumn, ChartTableProps } from './ChartTable';

export {
  ALL_PAIRS_SAFE_SLOTS,
  CATEGORICAL,
  CATEGORICAL_NAMES,
  CHART_CHROME,
  CHART_TEXT,
  LABEL_INK,
  MAX_CATEGORICAL,
  MAX_ORDINAL_STEPS,
  NEUTRAL,
  SEQUENTIAL,
  STATUS,
  contrastRatio,
  labelInkFor,
  ordinalRamp,
  seriesColor,
} from './palette';
export { formatCompact, formatNumber, formatShare } from './format';
export { useElementSize } from './useElementSize';
export type { ElementSize } from './useElementSize';
export type { CategoryFormatter, ChartDatum, ChartSeries, ChartTableMode, ValueFormatter } from './types';
