import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { ChartEmpty } from './ChartEmpty';
import { formatNumber, hasPlottableValues, toNumber } from './format';
import { linePath } from './geometry';
import type { Point } from './geometry';
import { CATEGORICAL, CHART_CHROME, NEUTRAL } from './palette';
import type { ValueFormatter } from './types';
import { useElementSize } from './useElementSize';
import { cx } from './cx';

/** Props for {@link Sparkline}. */
export interface SparklineProps {
  /** Values in time order; the last one is the current period. */
  values: number[];
  /** What the values are, e.g. "Orders, last 12 weeks". A summary of the values is appended. */
  ariaLabel: string;
  /** Height in px. Default 32. */
  height?: number;
  /** Width in px. Defaults to the container's width (responsive). */
  width?: number;
  /** Line colour. Defaults to the de-emphasis grey so the current period can carry the accent. */
  color?: string;
  /** Colour of the current period (last segment and end-dot). Defaults to brand blue. */
  accentColor?: string;
  /** Formats values in the accessible summary. */
  valueFormatter?: ValueFormatter;
  /** Text shown when there is no data or every value is zero. */
  emptyLabel?: string;
  className?: string;
}

const DOT_RADIUS = 4;
const DOT_RING = 2;

/**
 * A word-sized trend for stat tiles: a 2px line in the de-emphasis grey with the current period
 * (last segment and a ringed end-dot) in the accent. No axes and no hover layer — it supports a
 * number printed beside it, and its accessible name summarises the range.
 */
export function Sparkline({
  values,
  ariaLabel,
  height = 32,
  width,
  color = NEUTRAL.deEmphasis,
  accentColor = CATEGORICAL[0],
  valueFormatter = formatNumber,
  emptyLabel = 'No data yet',
  className,
}: SparklineProps) {
  const [measureRef, size] = useElementSize<HTMLDivElement>();
  const drawWidth = width ?? size.width;
  const clean = useMemo(() => values.map(toNumber), [values]);
  const isEmpty = clean.length === 0 || !hasPlottableValues(clean);

  const geometry = useMemo(() => {
    if (isEmpty || drawWidth <= 0) return null;
    const pad = DOT_RADIUS + DOT_RING;
    const low = Math.min(...clean);
    const high = Math.max(...clean);
    const span = high - low;
    const count = clean.length;
    const step = count > 1 ? (drawWidth - pad * 2) / (count - 1) : 0;
    const points: Point[] = clean.map((value, index) => [
      count > 1 ? pad + index * step : drawWidth / 2,
      span === 0 ? height / 2 : pad + (1 - (value - low) / span) * (height - pad * 2),
    ]);
    return { points };
  }, [clean, drawWidth, height, isEmpty]);

  const summary = isEmpty
    ? `${ariaLabel}: no data yet.`
    : `${ariaLabel}: ${clean.length} values, from ${valueFormatter(clean[0])} to ${valueFormatter(
        clean[clean.length - 1],
      )}; low ${valueFormatter(Math.min(...clean))}, high ${valueFormatter(Math.max(...clean))}.`;

  return (
    <div
      ref={measureRef}
      className={cx('relative', width === undefined && 'w-full', className)}
      style={{ width, height }}
    >
      {isEmpty ? (
        <ChartEmpty compact label={emptyLabel} icon={Activity} height={height} />
      ) : (
        geometry && (
          <svg
            role="img"
            aria-label={summary}
            width={drawWidth}
            height={height}
            viewBox={`0 0 ${drawWidth} ${height}`}
            className="block overflow-visible"
          >
            <path
              d={linePath(geometry.points)}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {geometry.points.length > 1 && (
              <path
                d={linePath(geometry.points.slice(-2))}
                fill="none"
                stroke={accentColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}
            <circle
              cx={geometry.points[geometry.points.length - 1][0]}
              cy={geometry.points[geometry.points.length - 1][1]}
              r={DOT_RADIUS}
              fill={accentColor}
              stroke={CHART_CHROME.surface}
              strokeWidth={DOT_RING}
            />
          </svg>
        )
      )}
    </div>
  );
}
