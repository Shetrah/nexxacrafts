/** Shared public types for the NexxaCraft chart library. */

/** One row of tabular chart data: the x/category key plus one numeric field per series. */
export type ChartDatum = Record<string, string | number>;

/** A plotted series: the data field it reads, its display label and an optional colour override. */
export interface ChartSeries {
  /** Field in each {@link ChartDatum} that holds this series' value. */
  key: string;
  /** Human label used in the legend, tooltip and table. */
  label: string;
  /**
   * Optional colour override. Defaults to the categorical slot at the series' index, so keep
   * series in a fixed order (colour follows the entity, never its rank).
   */
  color?: string;
}

/** Formats a numeric value for tooltips, labels and tables (e.g. `money` from `@/lib/catalog`). */
export type ValueFormatter = (value: number) => string;

/** Formats an x/category value for axis labels, tooltips and tables. */
export type CategoryFormatter = (value: string | number) => string;

/** How a chart exposes its accessible data table. */
export type ChartTableMode = 'toggle' | 'hidden';
