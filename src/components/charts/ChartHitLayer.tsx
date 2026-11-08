import type { ChartInteraction } from './useChartInteraction';

/** One focusable hit target, in the chart container's pixels. */
export interface HitTarget {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Accessible name, e.g. "Week of 3 Mar: Orders 12". */
  label: string;
}

/** Props for {@link ChartHitLayer}. */
export interface ChartHitLayerProps {
  targets: HitTarget[];
  /** Accessible name of the group of targets. */
  ariaLabel: string;
  interaction: ChartInteraction;
}

/**
 * Transparent HTML layer over the SVG that holds one focusable target per column, x position or
 * segment. Targets are bigger than the marks (the whole band, gaps included) and live outside the
 * `role="img"` graphic so assistive technology exposes them. The chart is a single tab stop;
 * Arrow keys, Home and End move between targets.
 */
export function ChartHitLayer({ targets, ariaLabel, interaction }: ChartHitLayerProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="absolute inset-0" {...interaction.layerProps}>
      {targets.map((target, index) => (
        <div
          key={index}
          role="img"
          aria-label={target.label}
          {...interaction.getTargetProps(index)}
          className="absolute rounded-md outline-offset-[-2px]"
          style={{ left: target.left, top: target.top, width: target.width, height: target.height }}
        />
      ))}
    </div>
  );
}
