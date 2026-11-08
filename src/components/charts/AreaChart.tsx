import { CartesianLineChart } from './CartesianLineChart';
import type { CartesianChartProps } from './CartesianLineChart';

/** Props for {@link AreaChart}. */
export type AreaChartProps = CartesianChartProps;

/**
 * Trend over time with a soft area wash (series hue at ~10% opacity) for a single series; with
 * several series it draws 2px lines only so washes never muddy each other, plus a legend.
 * A hairline crosshair snaps to the nearest x and one tooltip lists every series; keyboard users
 * move along the x positions with the arrow keys.
 *
 * @example
 * <AreaChart ariaLabel="Revenue by month" data={months} xKey="month"
 *   series={[{ key: 'revenue', label: 'Revenue' }]} valueFormatter={money} />
 */
export function AreaChart(props: AreaChartProps) {
  return <CartesianLineChart {...props} variant="area" fill={props.series.length === 1} />;
}
