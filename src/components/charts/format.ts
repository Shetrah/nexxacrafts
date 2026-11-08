/**
 * Number formatting, scales and text measurement shared by the chart components.
 * Locale is en-KE to match `money()` in `@/lib/catalog`.
 */
import type { ValueFormatter } from './types';

const LOCALE = 'en-KE';

const fullNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const compactNumber = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const wholePercent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });

/** Full number with grouping, e.g. `1,284`. The default value formatter for every chart. */
export const formatNumber: ValueFormatter = (value) => fullNumber.format(value);

/** Compact number, e.g. `12.5K`, `1.3M`. */
export const formatCompact: ValueFormatter = (value) => compactNumber.format(value);

/**
 * Share of a whole (0…1) as a whole percentage, e.g. `46%`. Tiny but non-zero shares read `<1%`
 * and near-whole shares read `>99%`, so rounding never claims 0% or 100% for a partial part.
 */
export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0%';
  if (share < 0.005) return '<1%';
  // A part that is not the whole never reads 100%.
  if (share < 1 && share >= 0.995) return '>99%';
  return wholePercent.format(share);
}

/**
 * Axis tick formatter: numbers in full below 10,000 (0 / 1,000 / 2,000) and compact on an axis
 * that reaches 10,000 (0 / 10K / 20K) — one style per axis.
 */
export function axisFormatterFor(maxAbs: number): ValueFormatter {
  return Math.abs(maxAbs) >= 10_000 ? formatCompact : formatNumber;
}

/** Coerces a datum field to a finite number (numeric strings allowed); anything else is 0. */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** True when at least one value would draw a visible mark (non-zero and finite). */
export function hasPlottableValues(values: readonly number[]): boolean {
  return values.some((value) => Number.isFinite(value) && value !== 0);
}

/** A linear scale from a data domain onto a pixel range, with its nice tick values. */
export interface LinearScale {
  /** Domain after rounding to nice ticks. */
  min: number;
  max: number;
  /** Tick values, ascending, including both ends. */
  ticks: number[];
  /** Maps a data value to a pixel position. */
  map: (value: number) => number;
}

function niceStep(rough: number): number {
  if (!(rough > 0) || !Number.isFinite(rough)) return 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * Builds a zero-anchored linear scale with clean ticks (1, 2, 2.5 or 5 × 10ⁿ).
 *
 * @param dataMin smallest value plotted (the domain always includes 0)
 * @param dataMax largest value plotted
 * @param rangeStart pixel for the domain minimum (e.g. plot bottom)
 * @param rangeEnd pixel for the domain maximum (e.g. plot top)
 * @param tickCount approximate number of intervals wanted
 * @param integer avoid fractional ticks (counts such as orders)
 */
export function linearScale(
  dataMin: number,
  dataMax: number,
  rangeStart: number,
  rangeEnd: number,
  tickCount: number,
  integer = false,
): LinearScale {
  const low = Math.min(0, dataMin);
  let high = Math.max(0, dataMax);
  if (high === low) high = low + 1;
  let step = niceStep((high - low) / Math.max(1, tickCount));
  if (integer && step < 1) step = 1;
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const ticks: number[] = [];
  const count = Math.round((max - min) / step);
  for (let index = 0; index <= count; index += 1) {
    ticks.push(Number((min + index * step).toFixed(decimals)));
  }
  const span = max - min || 1;
  return {
    min,
    max,
    ticks,
    map: (value) => rangeStart + ((value - min) / span) * (rangeEnd - rangeStart),
  };
}

/** Snaps a coordinate to the pixel grid so 1px hairlines render crisp. */
export function crisp(value: number): number {
  return Math.round(value) + 0.5;
}

let measureContext: CanvasRenderingContext2D | null | undefined;
const measureCache = { loaded: new Map<string, number>(), pending: new Map<string, number>() };

/** Measures label text in px: `(text, fontSize?, fontWeight?) => width`. */
export type TextMeasure = (text: string, fontSize?: number, fontWeight?: number) => number;

/**
 * Rendered width of `text` in the page font (Inter), measured on a canvas and cached. Falls back
 * to an average-glyph estimate outside the browser. Used to place labels only where they fit.
 *
 * @param fontsLoaded whether web fonts have loaded; widths measured with fallback fonts are cached
 *   separately so they are re-measured once Inter arrives
 */
export function measureText(text: string, fontSize = 11, fontWeight = 400, fontsLoaded = true): number {
  const cache = fontsLoaded ? measureCache.loaded : measureCache.pending;
  const key = `${fontWeight}|${fontSize}|${text}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  if (measureContext === undefined) {
    measureContext =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  }
  let width = text.length * fontSize * 0.6;
  if (measureContext) {
    measureContext.font = `${fontWeight} ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
    width = measureContext.measureText(text).width;
  }
  if (cache.size > 2000) cache.clear();
  cache.set(key, width);
  return width;
}

/**
 * Chooses which x labels to print so neighbours never collide. Thinning is anchored on the last
 * label (the most recent period), then every `step`-th label going back.
 *
 * @param labels formatted labels in x order
 * @param spacing pixel distance between neighbouring label centres
 * @param fontSize label font size in px
 * @param measure text measurer (pass the one from `useTextMeasure` so fonts are accounted for)
 * @returns the indices to render
 */
export function thinLabels(
  labels: readonly string[],
  spacing: number,
  fontSize: number,
  measure: TextMeasure = measureText,
): Set<number> {
  const shown = new Set<number>();
  if (labels.length === 0) return shown;
  const widest = Math.max(...labels.map((label) => measure(label, fontSize)));
  const step = Math.max(1, Math.ceil((widest + 12) / Math.max(spacing, 1)));
  for (let index = labels.length - 1; index >= 0; index -= step) shown.add(index);
  return shown;
}

/** Clamps `value` into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
