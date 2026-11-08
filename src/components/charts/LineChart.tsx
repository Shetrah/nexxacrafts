import { CartesianLineChart } from './CartesianLineChart';
import type { CartesianChartProps } from './CartesianLineChart';

/** Props for {@link LineChart}. */
export type LineChartProps = CartesianChartProps;

/**
 * Multi-series trend lines (2px, round joins) without area washes — the choice when several
 * series share one axis. Same crosshair, tooltip, end labels and table view as {@link AreaChart}.
 * Never put two measures of different scale on one chart: use two charts instead.
 */
export function LineChart(props: LineChartProps) {
  return <CartesianLineChart {...props} variant="line" fill={false} />;
}
