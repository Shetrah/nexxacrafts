/**
 * nexxacrafts chart palette ("Process" theme) — the single source of colour for every chart.
 *
 * Derived with the dataviz method (form → colour job → validate → marks → interaction) and the
 * runnable validator `validate_palette.js` (OKLab ΔE ×100, Machado-Oliveira-Fernandes 2009 CVD
 * simulation at severity 1.0). Every value below is a step of a design-system ramp
 * (`brand-*` from docs/DESIGN_SYSTEM.md, the rest Tailwind's default ramps); nothing is eyeballed.
 *
 * ## Categorical slots (light mode — the app is light-mode only)
 *
 * | Slot | Name     | Ramp step   | Hex       | OKLCH L / C | vs #FFFFFF | Label ink inside fills |
 * |------|----------|-------------|-----------|-------------|------------|------------------------|
 * | 1    | Blue     | brand-600   | `#0341FC` | 0.500 / 0.276 | 6.63:1   | white                  |
 * | 2    | Teal     | teal-500    | `#14B8A6` | 0.704 / 0.123 | 2.49:1   | ink                    |
 * | 3    | Plum     | fuchsia-700 | `#A21CAF` | 0.518 / 0.226 | 6.32:1   | white                  |
 * | 4    | Amber    | amber-500   | `#F59E0B` | 0.769 / 0.165 | 2.15:1   | ink                    |
 * | 5    | Lavender | violet-400  | `#A78BFA` | 0.709 / 0.159 | 2.72:1   | ink                    |
 * | 6    | Olive    | lime-700    | `#4D7C0F` | 0.532 / 0.141 | 4.99:1   | white                  |
 * | 7    | Pink     | pink-400    | `#F472B6` | 0.725 / 0.175 | 2.65:1   | ink                    |
 * | 8    | Umber    | amber-800   | `#92400E` | 0.473 / 0.125 | 7.09:1   | white                  |
 *
 * ## Ordering rationale
 *
 * - Slot 1 is the brand's electric blue, so a single-series chart is always on-brand.
 * - Slots 1–4 mirror process inks — key (brand blue), cyan (teal), magenta (plum), yellow
 *   (amber) — a quiet nod to nexxacrafts's print floor, alternating dark/light so neighbours
 *   separate by lightness as well as hue.
 * - The warm sector of the wheel belongs to status: `danger` (red-600) and `warning` (amber-600)
 *   sit at OKLCH h 27–58 and red is brand punctuation, so red/rose/orange are excluded and the
 *   palette carries exactly one warm hue in its opening (amber-500, ΔE 10.8 from `warning`). The
 *   second warm hue (umber) is the last slot, kept dark so it never reads as amber or red.
 * - Every slot keeps ΔE ≥ 8 from every status token (closest: lime-700 ↔ success-600 9.8,
 *   lime-700 ↔ success-700 8.3, amber-500 ↔ warning-600 10.8, teal-500 ↔ success-600 11.6), so
 *   a series never impersonates a status. Status meaning still always ships with an icon + label.
 * - Fuchsia-700 (not 500/600) and violet-400 (not 500/600) were chosen because the brighter
 *   steps collapse against brand blue under protan/deutan simulation (ΔE 5–6); a donut's last
 *   slice touches its first, so those pairs matter.
 * - Order search: all 5,040 orders of these eight steps were enumerated with slot 1 fixed. The
 *   best minimum adjacent CVD ΔE is 21.7; this order scores 20.6 (rank 12, a near-tie) and was
 *   picked among the top orders for its opening, exactly as the reference palette was. Orders
 *   that scored higher open with umber or place two ambers side by side.
 *
 * ## Validator results (`node validate_palette.js "<slots>" --mode light --surface "#FFFFFF"`)
 *
 * - Lightness band: PASS (all 8 inside L 0.43–0.77).
 * - Chroma floor: PASS (all 8 ≥ 0.10).
 * - CVD separation (adjacent): PASS — worst pink-400 ↔ lime-700 ΔE 20.6 (protan), tritan 17.4
 *   (target ≥ 8).
 * - Normal-vision floor (adjacent): PASS — worst umber ↔ pink-400 ΔE 29.3 (floor ≥ 15).
 * - Contrast vs surface: WARN (relief) — teal 2.49, amber 2.15, lavender 2.72, pink 2.65 are
 *   below 3:1. Relief is built in: every chart has a visible "Table" toggle (the table view),
 *   values on hover/focus, legends and direct labels. Do not remove the table toggle.
 * - `--pairs all`: slots 1–6 PASS (worst plum ↔ blue ΔE 12.6 CVD, olive ↔ teal 20.6 normal);
 *   all 8 FAIL (pink ↔ teal 3.0 deutan) — so scatter / bubble / small-multiple forms cap at six
 *   series. This is why `DonutChart` defaults to six slices: any arrangement of slots 1–6 is safe.
 * - Paper (`#F7F7F4`) and canvas (`#F4F6F9`) surfaces: same PASS/WARN profile.
 * - Dark mode (recorded, not shipped): `--mode dark` against ink-900 `#0B1220` (and the default
 *   `#1a1a19`) FAILS the dark lightness band (teal, amber, lavender, pink above L 0.67; umber below
 *   0.48) and WARNs on contrast for blue 2.82, plum 2.96, umber 2.64. CVD 20.6 / normal 29.3 still
 *   pass. Charts must render on light surfaces only; a dark theme would need its own selected
 *   steps from the same ramps, validated against the ink surface.
 *
 * ## Ordinal & sequential (brand blue ramp)
 *
 * Ordered categories (pipeline stages, tiers) take `ordinalRamp(n)`: one hue, light → dark, the
 * light end no lighter than brand-300 (2.16:1 on white, ordinal floor ≥ 2:1) and adjacent steps
 * ≥ 0.06 apart in OKLCH L. Validated with `--ordinal` for n = 2…6 (all PASS, hue spread 5°).
 * brand-500 → 600 (ΔL 0.051) and 800 → 900 (ΔL 0.045) are too close, so the ramps skip them.
 * `SEQUENTIAL` is the full brand-100…900 ramp for continuous magnitude only (monotone L, single
 * hue); its pale end deliberately recedes toward the surface, so never use it for discrete marks.
 *
 * @module
 */

/** Categorical slots in fixed order. Assign in sequence; never cycle, never generate a 9th. */
export const CATEGORICAL = [
  '#0341FC',
  '#14B8A6',
  '#A21CAF',
  '#F59E0B',
  '#A78BFA',
  '#4D7C0F',
  '#F472B6',
  '#92400E',
] as const;

/** Human names for the categorical slots (same order as {@link CATEGORICAL}). */
export const CATEGORICAL_NAMES = [
  'Blue',
  'Teal',
  'Plum',
  'Amber',
  'Lavender',
  'Olive',
  'Pink',
  'Umber',
] as const;

/** Number of categorical slots. Series beyond this fold into "Other" — never a generated hue. */
export const MAX_CATEGORICAL = CATEGORICAL.length;

/**
 * How many slots stay distinct in every arrangement (`--pairs all` PASS). Forms where any two
 * marks can touch (donut slices after folding, scatter, small multiples) cap here.
 */
export const ALL_PAIRS_SAFE_SLOTS = 6;

/**
 * Neutral roles. `other` fills "Other" slices/segments/rows (distinct from every slot under CVD,
 * ΔE ≥ 13); `deEmphasis` is for context lines such as the body of a sparkline.
 */
export const NEUTRAL = {
  other: '#CBD5E1',
  deEmphasis: '#94A3B8',
} as const;

/**
 * Brand blue ramp (brand-100…900) for continuous magnitude (e.g. heat cells). Light → dark.
 * Not for discrete marks — use {@link ordinalRamp} for those.
 */
export const SEQUENTIAL = [
  '#DCE6FF',
  '#BFD0FF',
  '#93AEFF',
  '#5F83FF',
  '#2F5BFE',
  '#0341FC',
  '#0234D0',
  '#062BA6',
  '#0B2783',
] as const;

/** Validated ordinal ramps (light → dark) keyed by step count. Each passed `--ordinal`. */
const ORDINAL_RAMPS: Readonly<Record<number, readonly string[]>> = {
  1: ['#0341FC'],
  2: ['#93AEFF', '#0234D0'],
  3: ['#93AEFF', '#0341FC', '#0B2783'],
  4: ['#93AEFF', '#2F5BFE', '#0234D0', '#0B2783'],
  5: ['#93AEFF', '#5F83FF', '#2F5BFE', '#0234D0', '#0B2783'],
  6: ['#93AEFF', '#5F83FF', '#2F5BFE', '#0234D0', '#0B2783', '#0A1A50'],
};

/** Largest ordinal ramp the brand blue can carry with visible steps. Group stages beyond this. */
export const MAX_ORDINAL_STEPS = 6;

/**
 * Status colours from the design tokens. Reserved: use them only when a series *means* a state
 * (paid / overdue / cancelled), always alongside an icon + text label, and never mix them with
 * categorical slots in one chart. They are never categorical slots.
 */
export const STATUS = {
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',
} as const;

/** Chart chrome on the light surface: one step off the surface, hairline, solid. */
export const CHART_CHROME = {
  /** Chart surface; also the colour of the 2px gaps and marker rings. */
  surface: '#FFFFFF',
  /** Gridlines (design token `line`). */
  grid: '#E3E7EE',
  /** Zero baseline / axis rule (design token `line-strong`). */
  axis: '#CBD3DF',
  /** Hover crosshair hairline. */
  crosshair: '#94A3B8',
  /** Hovered column band behind bars (design token `canvas`). */
  hoverBand: '#F4F6F9',
} as const;

/** Text tokens for chart text. Text never wears a series colour. */
export const CHART_TEXT = {
  /** Values, centre figures (slate-900, 17.9:1). */
  primary: '#0F172A',
  /** Labels (slate-700, 10.4:1). */
  body: '#334155',
  /** Secondary labels (slate-600, 7.6:1). */
  secondary: '#475569',
  /** Axis ticks and meta (slate-500, 4.8:1 — the floor for meaningful text). */
  muted: '#64748B',
} as const;

/** Ink used for labels printed inside a coloured fill. */
export const LABEL_INK = {
  light: '#FFFFFF',
  dark: '#0F172A',
} as const;

let warnedOverflow = false;

/**
 * Colour for categorical slot `index` (0-based). Returns {@link NEUTRAL.other} past the eighth
 * slot instead of cycling, so an overflowing series reads as "Other", never as an existing slot.
 *
 * Colour follows the entity: pass a stable index per entity (e.g. its position in the service
 * catalogue), not its current rank, so filtering never repaints the survivors.
 */
export function seriesColor(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= CATEGORICAL.length) {
    if (import.meta.env.DEV && !warnedOverflow) {
      warnedOverflow = true;
      console.warn(
        `[charts] Series index ${index} has no categorical slot (max ${CATEGORICAL.length}); it is drawn as "Other". Fold the tail or pass explicit colours.`,
      );
    }
    return NEUTRAL.other;
  }
  return CATEGORICAL[index];
}

/**
 * A validated light → dark ordinal ramp of `steps` colours from the brand blue (1…6).
 * Throws for more than {@link MAX_ORDINAL_STEPS}: group the stages instead of inventing steps.
 */
export function ordinalRamp(steps: number): string[] {
  const count = Math.max(1, Math.floor(steps));
  const ramp = ORDINAL_RAMPS[count];
  if (!ramp) {
    throw new RangeError(
      `ordinalRamp supports 1–${MAX_ORDINAL_STEPS} steps (got ${steps}); group the stages instead.`,
    );
  }
  return [...ramp];
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a `#rrggbb` colour, or `null` when the string is not one. */
function relativeLuminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!match) return null;
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => channelToLinear(parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two `#rrggbb` colours (1 when either is not parseable). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * White or near-black — whichever reads better — for a label printed inside `fill`.
 * Uses the WCAG ratio so in-fill labels meet the design system's 4.5:1 text rule where any ink can.
 */
export function labelInkFor(fill: string): string {
  return contrastRatio(LABEL_INK.light, fill) >= contrastRatio(LABEL_INK.dark, fill)
    ? LABEL_INK.light
    : LABEL_INK.dark;
}
