import { useId, useMemo } from 'react';
import { BarChartHorizontal } from 'lucide-react';
import { ChartFrame } from './ChartFrame';
import { ChartHitLayer } from './ChartHitLayer';
import type { HitTarget } from './ChartHitLayer';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip } from './ChartTooltip';
import { formatNumber, formatShare, toNumber } from './format';
import { MAX_CATEGORICAL, NEUTRAL, labelInkFor, seriesColor } from './palette';
import type { ChartTableMode, ValueFormatter } from './types';
import { useChartInteraction } from './useChartInteraction';
import type { ChartInteraction } from './useChartInteraction';
import { useTextMeasure } from './useElementSize';

/** One part of the whole. */
export interface StackedBarSegment {
  label: string;
  value: number;
  /**
   * Colour override; defaults to the categorical slot at the segment's index. For ordered
   * stages (a pipeline) pass `ordinalRamp(n)` colours; for states pass status tokens.
   */
  color?: string;
}

/** Props for {@link StackedBar}. */
export interface StackedBarProps {
  /** Parts in display order (left → right). Parts at zero draw nothing. */
  segments: StackedBarSegment[];
  /** Chart name, e.g. "Order pipeline". Leads the accessible summary. */
  ariaLabel: string;
  /** Legend of names in block order. Defaults to `true` for the tall bar, `false` for thin. */
  showLegend?: boolean;
  /** Formats amounts in the tooltip, table and accessible summary. */
  valueFormatter?: ValueFormatter;
  /**
   * `tall` (default): 28px blocks with each share printed where it fits — a standalone figure.
   * `thin`: an 8px bar with no text, for use beside figures that already name each part.
   */
  size?: 'tall' | 'thin';
  emptyLabel?: string;
  emptyDescription?: string;
  /** Defaults to `toggle` for the tall bar and `hidden` (sr-only table) for thin. */
  tableMode?: ChartTableMode;
  loading?: boolean;
  className?: string;
}

const GAP = 2;
const TALL = 28;
const THIN = 8;
const LABEL_FONT = 12;
const LABEL_PAD = 8;
const MIN_TARGET = 12;

interface Block {
  label: string;
  value: number;
  share: number;
  color: string;
}

function buildBlocks(segments: StackedBarSegment[]): { blocks: Block[]; total: number } {
  const items = segments
    .map((segment, index) => ({ ...segment, value: Math.max(0, toNumber(segment.value)), index }))
    .filter((segment) => segment.value > 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return { blocks: [], total: 0 };
  const blocks: Block[] = [];
  let otherValue = 0;
  for (const item of items) {
    if (item.color === undefined && item.index >= MAX_CATEGORICAL) {
      otherValue += item.value;
    } else {
      blocks.push({
        label: item.label,
        value: item.value,
        share: item.value / total,
        color: item.color ?? seriesColor(item.index),
      });
    }
  }
  if (otherValue > 0) {
    blocks.push({ label: 'Other', value: otherValue, share: otherValue / total, color: NEUTRAL.other });
  }
  return { blocks, total };
}

/**
 * One whole split into parts as a single 100% bar (e.g. orders by pipeline stage) — the
 * dataviz "segmented bar" figure. Each part is its own block separated by a 2px surface gap;
 * hovering or focusing a block shows its name, amount and share, and the legend lists names in
 * block order without repeating numbers. Keep it to six parts or fewer.
 */
export function StackedBar({
  segments,
  ariaLabel,
  showLegend,
  valueFormatter = formatNumber,
  size = 'tall',
  emptyLabel = 'No data yet',
  emptyDescription,
  tableMode,
  loading = false,
  className,
}: StackedBarProps) {
  const { blocks, total } = useMemo(() => buildBlocks(segments), [segments]);
  const interaction = useChartInteraction(blocks.length);
  const legendVisible = showLegend ?? size === 'tall';
  const barHeight = size === 'tall' ? TALL : THIN;

  const table = useMemo(
    () => ({
      columns: [
        { key: 'label', label: 'Part' },
        { key: 'value', label: 'Value', numeric: true },
        { key: 'share', label: 'Share', numeric: true },
      ],
      rows: segments.map((segment) => {
        const value = Math.max(0, toNumber(segment.value));
        return {
          label: segment.label,
          value: valueFormatter(value),
          share: total > 0 ? formatShare(value / total) : '0%',
        };
      }),
    }),
    [segments, total, valueFormatter],
  );

  const summary = useMemo(() => {
    if (blocks.length === 0) return `${ariaLabel}. No data.`;
    const parts = blocks.map(
      (block) => `${block.label} ${valueFormatter(block.value)} (${formatShare(block.share)})`,
    );
    return `${ariaLabel}. ${blocks.length} ${blocks.length === 1 ? 'part' : 'parts'}, total ${valueFormatter(total)}: ${parts.join(', ')}.`;
  }, [ariaLabel, blocks, total, valueFormatter]);

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      height={barHeight}
      isEmpty={blocks.length === 0}
      emptyLabel={emptyLabel}
      emptyDescription={emptyDescription}
      emptyIcon={BarChartHorizontal}
      legend={
        legendVisible ? (
          <ChartLegend items={blocks.map((block) => ({ label: block.label, color: block.color }))} />
        ) : undefined
      }
      table={table}
      tableMode={tableMode ?? (size === 'tall' ? 'toggle' : 'hidden')}
      loading={loading}
      className={className}
    >
      {(width) => (
        <SegmentPlot
          width={width}
          barHeight={barHeight}
          tall={size === 'tall'}
          blocks={blocks}
          summary={summary}
          ariaLabel={ariaLabel}
          valueFormatter={valueFormatter}
          interaction={interaction}
        />
      )}
    </ChartFrame>
  );
}

interface SegmentPlotProps {
  width: number;
  barHeight: number;
  tall: boolean;
  blocks: Block[];
  summary: string;
  ariaLabel: string;
  valueFormatter: ValueFormatter;
  interaction: ChartInteraction;
}

function SegmentPlot({
  width,
  barHeight,
  tall,
  blocks,
  summary,
  ariaLabel,
  valueFormatter,
  interaction,
}: SegmentPlotProps) {
  const measure = useTextMeasure();
  const clipId = `stacked-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const layout = useMemo(() => {
    const available = Math.max(0, width - GAP * (blocks.length - 1));
    let x = 0;
    return blocks.map((block) => {
      const blockWidth = available * block.share;
      const share = formatShare(block.share);
      const fits = tall && measure(share, LABEL_FONT, 600) + LABEL_PAD * 2 <= blockWidth;
      const item = { x, width: blockWidth, share, fits };
      x += blockWidth + GAP;
      return item;
    });
  }, [width, blocks, tall, measure]);

  const active = interaction.activeIndex;
  const targets: HitTarget[] = layout.map((item, index) => {
    // The hit area covers the block and its gap; slivers still get a 12px target.
    const targetWidth = Math.max(item.width + GAP, MIN_TARGET);
    const left = Math.min(
      Math.max(item.x + item.width / 2 - targetWidth / 2, -GAP / 2),
      width + GAP / 2 - targetWidth,
    );
    return {
      left,
      top: -6,
      width: targetWidth,
      height: barHeight + 12,
      label: `${blocks[index].label}: ${valueFormatter(blocks[index].value)}, ${item.share}`,
    };
  });

  return (
    <>
      <svg
        role="img"
        aria-label={summary}
        width={width}
        height={barHeight}
        viewBox={`0 0 ${width} ${barHeight}`}
        className="block select-none overflow-visible"
      >
        {!tall && (
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={width} height={barHeight} rx={barHeight / 2} />
            </clipPath>
          </defs>
        )}
        <g clipPath={tall ? undefined : `url(#${clipId})`}>
          {layout.map((item, index) => {
            const block = blocks[index];
            const radius = tall ? Math.min(4, item.width / 2) : 0;
            return (
              <g
                key={`${block.label}-${index}`}
                className="transition-opacity duration-150 ease-out"
                opacity={active !== null && active !== index ? 0.4 : 1}
              >
                <rect
                  x={item.x}
                  y={0}
                  width={Math.max(0, item.width)}
                  height={barHeight}
                  rx={radius}
                  fill={block.color}
                />
                {item.fits && (
                  <text
                    x={item.x + LABEL_PAD}
                    y={barHeight / 2}
                    dominantBaseline="middle"
                    fontSize={LABEL_FONT}
                    fontWeight={600}
                    fill={labelInkFor(block.color)}
                    className="tabular-nums"
                  >
                    {item.share}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <ChartHitLayer
        targets={targets}
        ariaLabel={`${ariaLabel}: ${blocks.length} ${blocks.length === 1 ? 'part' : 'parts'}. Use the arrow keys to move between parts.`}
        interaction={interaction}
      />
      {active !== null && layout[active] && (
        <ChartTooltip
          placement="top"
          x={layout[active].x + layout[active].width / 2}
          y={0}
          bounds={{ width, height: barHeight }}
          title={blocks[active].label}
          rows={[
            {
              label: `${layout[active].share} of total`,
              value: valueFormatter(blocks[active].value),
              color: blocks[active].color,
            },
          ]}
        />
      )}
    </>
  );
}
