/** SVG path builders shared by the charts. All coordinates are in SVG user units (= CSS px). */

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * A vertical bar from `baseline` to `end` whose data-end corners are rounded (4px by default)
 * while the baseline end stays square. Works for bars growing up (positive) or down (negative).
 */
export function columnPath(x: number, width: number, baseline: number, end: number, radius = 4): string {
  const height = Math.abs(baseline - end);
  if (height <= 0 || width <= 0) return '';
  const r = Math.max(0, Math.min(radius, width / 2, height));
  const x0 = round(x);
  const x1 = round(x + width);
  const b = round(baseline);
  const e = round(end);
  if (r === 0) return `M${x0},${b}V${e}H${x1}V${b}Z`;
  const rr = round(r);
  // Growing up, the rounded corners turn clockwise (sweep 1); growing down, anticlockwise.
  const up = end < baseline;
  const sweep = up ? 1 : 0;
  const shoulder = round(up ? end + r : end - r);
  return [
    `M${x0},${b}`,
    `V${shoulder}`,
    `A${rr},${rr} 0 0 ${sweep} ${round(x + r)},${e}`,
    `H${round(x + width - r)}`,
    `A${rr},${rr} 0 0 ${sweep} ${x1},${shoulder}`,
    `V${b}Z`,
  ].join('');
}

/** A point on a line or area. */
export type Point = readonly [number, number];

/** Interpolation between points: straight segments, or a monotone cubic that never overshoots. */
export type Curve = 'linear' | 'monotone';

/**
 * Monotone cubic tangents (Steffen 1990, as in d3's `curveMonotoneX`): the curve passes through
 * every point and never invents a peak or dip between them.
 */
function monotoneTangents(points: readonly Point[]): number[] {
  const n = points.length;
  const slopes: number[] = [];
  const widths: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    widths[i] = points[i + 1][0] - points[i][0];
    slopes[i] = widths[i] ? (points[i + 1][1] - points[i][1]) / widths[i] : 0;
  }
  const tangents = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i += 1) {
    const h0 = widths[i - 1];
    const h1 = widths[i];
    const s0 = slopes[i - 1];
    const s1 = slopes[i];
    const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1);
    tangents[i] =
      (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  }
  tangents[0] = (3 * slopes[0] - tangents[1]) / 2;
  tangents[n - 1] = (3 * slopes[n - 2] - tangents[n - 2]) / 2;
  return tangents;
}

/** Path data through `points` (no leading move for continuation when `continued` is true). */
function segmentPath(points: readonly Point[], curve: Curve, continued: boolean): string {
  const [first] = points;
  const head = `${continued ? 'L' : 'M'}${round(first[0])},${round(first[1])}`;
  if (points.length < 3 || curve === 'linear') {
    return (
      head +
      points
        .slice(1)
        .map(([x, y]) => `L${round(x)},${round(y)}`)
        .join('')
    );
  }
  const tangents = monotoneTangents(points);
  let path = head;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const third = (x1 - x0) / 3;
    path += `C${round(x0 + third)},${round(y0 + third * tangents[i])} ${round(x1 - third)},${round(
      y1 - third * tangents[i + 1],
    )} ${round(x1)},${round(y1)}`;
  }
  return path;
}

/** Path for a line through `points`. */
export function linePath(points: readonly Point[], curve: Curve = 'linear'): string {
  if (points.length === 0) return '';
  return segmentPath(points, curve, false);
}

/** Closed path for the area between the line through `points` and the horizontal `baseline`. */
export function areaPath(points: readonly Point[], baseline: number, curve: Curve = 'linear'): string {
  if (points.length < 2) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `M${round(first[0])},${round(baseline)}${segmentPath(points, curve, true)}L${round(last[0])},${round(
    baseline,
  )}Z`;
}

const polar = (cx: number, cy: number, radius: number, angle: number): Point => [
  cx + radius * Math.sin(angle),
  cy - radius * Math.cos(angle),
];

/**
 * One slice of a ring (donut), from `start` to `end` radians measured clockwise from 12 o'clock,
 * with a `gap`-wide parallel-sided gap of surface on each side (half on this slice, half on its
 * neighbour). Returns '' when the slice is too thin to draw.
 */
export function ringSegmentPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
  gap = 2,
): string {
  const sweep = end - start;
  if (sweep <= 0) return '';
  if (sweep >= Math.PI * 2 - 1e-6) {
    const [ox, oy] = [round(cx), round(cy - outer)];
    const [ix, iy] = [round(cx), round(cy - inner)];
    return (
      `M${ox},${oy}A${outer},${outer} 0 1 1 ${ox},${round(cy + outer)}A${outer},${outer} 0 1 1 ${ox},${oy}Z` +
      `M${ix},${iy}A${inner},${inner} 0 1 0 ${ix},${round(cy + inner)}A${inner},${inner} 0 1 0 ${ix},${iy}Z`
    );
  }
  const half = gap / 2;
  const outerOffset = Math.asin(Math.min(1, half / outer));
  if (sweep <= outerOffset * 2) return '';
  const [oxs, oys] = polar(cx, cy, outer, start + outerOffset);
  const [oxe, oye] = polar(cx, cy, outer, end - outerOffset);
  const outerLarge = sweep - outerOffset * 2 > Math.PI ? 1 : 0;
  let path = `M${round(oxs)},${round(oys)}A${outer},${outer} 0 ${outerLarge} 1 ${round(oxe)},${round(oye)}`;

  const innerOffset = Math.asin(Math.min(1, half / inner));
  if (sweep > innerOffset * 2) {
    const [ixe, iye] = polar(cx, cy, inner, end - innerOffset);
    const [ixs, iys] = polar(cx, cy, inner, start + innerOffset);
    const innerLarge = sweep - innerOffset * 2 > Math.PI ? 1 : 0;
    path += `L${round(ixe)},${round(iye)}A${inner},${inner} 0 ${innerLarge} 0 ${round(ixs)},${round(iys)}Z`;
  } else {
    // The gap lines meet before the inner radius: close the slice at their intersection.
    const apex = half / Math.sin(sweep / 2);
    const [ax, ay] = polar(cx, cy, apex, start + sweep / 2);
    path += `L${round(ax)},${round(ay)}Z`;
  }
  return path;
}
