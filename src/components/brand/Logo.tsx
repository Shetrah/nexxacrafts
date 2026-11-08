/**
 * nexxacrafts logo system, rendered as inline SVG (no network request, no font dependency).
 *
 * Every shape is built from geometric primitives (circles, lines, rounded rectangles). The path
 * data mirrors the master files in /public/brand (nexxacrafts-logo, -wordmark, -mark): change both together.
 */

/** `full` stacked lockup (master) · `wordmark` single line · `mark` "N." monogram tile. */
export type LogoVariant = 'full' | 'wordmark' | 'mark';

/** `color` brand blue + red · `inverse` for dark backgrounds · `mono` `currentColor` only. */
export type LogoTone = 'color' | 'inverse' | 'mono';

export interface LogoProps {
  /** Lockup to render. Defaults to `full` (stacked "N" + "exxa" / "CRAFT"). */
  variant?: LogoVariant;
  /** Colour treatment. Defaults to `color`. */
  tone?: LogoTone;
  /**
   * Size by height, width follows the aspect ratio: e.g. `h-9 w-auto`. When omitted the logo
   * renders 36px tall (`h-9 w-auto shrink-0`; the mark `size-9 shrink-0`).
   */
  className?: string;
  /** Accessible name. Pass `''` when the logo is decorative (e.g. beside a visible brand name). */
  title?: string;
}

export type LogoMarkProps = Omit<LogoProps, 'variant'>;

const BLUE = '#0341FC'; // brand-600
const RED = '#DC2626'; // accent-600
const WHITE = '#FFFFFF';
const RED_ON_DARK = '#EF4444'; // accent-500: 5.0:1 on ink-900 (accent-600 would be 3.9:1)

/** Stacked lockup: the tall N spans "exxa" (x-height 200) over "CRAFT" (cap height 160). */
const FULL = {
  viewBox: '0 0 1170 402',
  nexxa:
    'M41 2h60L254 269.92V2h82V361a41 41 0 0 1 -41 41H235L82 134.08V402H0V43A41 41 0 0 1 41 2ZM554.66 140A102 102 0 0 1 358 102A102 102 0 0 1 460 0A102 102 0 0 1 562 102a102 102 0 0 1 -1.26 16H420.09a43 43 0 0 0 60.03 22ZM500.66 88a43 43 0 0 0 -81.32 0ZM553.75 2h57.32a43 43 0 0 0 43 43a43 43 0 0 0 43 -43h57.32A100.32 100.32 0 0 1 662.07 102a100.32 100.32 0 0 1 92.32 100H697.07a43 43 0 0 0 -43 -43a43 43 0 0 0 -43 43H553.75A100.32 100.32 0 0 1 646.07 102A100.32 100.32 0 0 1 553.75 2ZM773.61 2h57.32a43 43 0 0 0 43 43a43 43 0 0 0 43 -43h57.32A100.32 100.32 0 0 1 881.93 102a100.32 100.32 0 0 1 92.32 100H916.93a43 43 0 0 0 -43 -43a43 43 0 0 0 -43 43H773.61A100.32 100.32 0 0 1 865.93 102A100.32 100.32 0 0 1 773.61 2ZM1068 0a102 102 0 0 1 102 102V202h-59v-7.51A102 102 0 1 1 1068 0ZM1111 102a43 43 0 0 0 -86 0a43 43 0 0 0 86 0Z',
  craft:
    'M409 242h92.2v18a18 18 0 0 1 -18 18H409a13 13 0 0 0 -13 13v62a13 13 0 0 0 13 13h74.2a18 18 0 0 1 18 18v18H409A49 49 0 0 1 360 353V291a49 49 0 0 1 49 -49ZM527.2 242h92.2a49 49 0 0 1 49 49a49 49 0 0 1 -37.96 47.74L668.4 402H626.42l-37.2 -62H563.2v62h-36V304h92.2a13 13 0 0 0 13 -13a13 13 0 0 0 -13 -13H545.2a18 18 0 0 1 -18 -18ZM743.4 242h92.2v18a18 18 0 0 1 -18 18H743.4a13 13 0 0 0 -13 13v31a18 18 0 0 1 18 -18h87.2v98h-36V340H730.4v62h-36V291a49 49 0 0 1 49 -49ZM879.6 242h123.2v18a18 18 0 0 1 -18 18H897.6v26h71.31v18a18 18 0 0 1 -18 18H897.6v62h-36V260a18 18 0 0 1 18 -18ZM1046.8 242H1170v18a18 18 0 0 1 -18 18H1028.8V260a18 18 0 0 1 18 -18ZM1081.4 304h36v80a18 18 0 0 1 -18 18h-18Z',
} as const;

/** Single line "nexxacrafts": CRAFT capitals sit on the x-height band of "exxa". */
const WORDMARK = {
  viewBox: '0 0 2130 290',
  nexxa:
    'M29.52 0h43.2L182.88 192.9V0h59.04V258.48A29.52 29.52 0 0 1 212.4 288H169.2L59.04 95.1V288H0V29.52A29.52 29.52 0 0 1 29.52 0ZM456.58 226A102 102 0 0 1 259.92 188a102 102 0 0 1 102 -102a102 102 0 0 1 102 102a102 102 0 0 1 -1.26 16H322.01a43 43 0 0 0 60.03 22ZM402.58 174a43 43 0 0 0 -81.32 0ZM455.67 88h57.32a43 43 0 0 0 43 43a43 43 0 0 0 43 -43h57.32A100.32 100.32 0 0 1 563.99 188a100.32 100.32 0 0 1 92.32 100H598.99a43 43 0 0 0 -43 -43a43 43 0 0 0 -43 43H455.67A100.32 100.32 0 0 1 547.99 188A100.32 100.32 0 0 1 455.67 88ZM675.53 88h57.32a43 43 0 0 0 43 43a43 43 0 0 0 43 -43h57.32A100.32 100.32 0 0 1 783.85 188a100.32 100.32 0 0 1 92.32 100H818.85a43 43 0 0 0 -43 -43a43 43 0 0 0 -43 43H675.53A100.32 100.32 0 0 1 767.85 188A100.32 100.32 0 0 1 675.53 88ZM969.92 86a102 102 0 0 1 102 102V288h-59v-7.51A102 102 0 1 1 969.92 86ZM1012.92 188a43 43 0 0 0 -86 0a43 43 0 0 0 86 0Z',
  craft:
    'M1178.75 88H1294v22.5A22.5 22.5 0 0 1 1271.5 133h-92.75a16.25 16.25 0 0 0 -16.25 16.25v77.5A16.25 16.25 0 0 0 1178.75 243h92.75a22.5 22.5 0 0 1 22.5 22.5V288H1178.75A61.25 61.25 0 0 1 1117.5 226.75v-77.5A61.25 61.25 0 0 1 1178.75 88ZM1326.5 88h115.25A61.25 61.25 0 0 1 1503 149.25a61.25 61.25 0 0 1 -47.45 59.67L1503 288h-52.48l-46.5 -77.5H1371.5V288h-45V165.5h115.25A16.25 16.25 0 0 0 1458 149.25A16.25 16.25 0 0 0 1441.75 133H1349a22.5 22.5 0 0 1 -22.5 -22.5ZM1596.75 88H1712v22.5A22.5 22.5 0 0 1 1689.5 133h-92.75a16.25 16.25 0 0 0 -16.25 16.25V188A22.5 22.5 0 0 1 1603 165.5h109V288h-45V210.5h-86.5V288h-45V149.25A61.25 61.25 0 0 1 1596.75 88ZM1767 88h154v22.5A22.5 22.5 0 0 1 1898.5 133h-109v32.5h89.14V188a22.5 22.5 0 0 1 -22.5 22.5H1789.5V288h-45V110.5A22.5 22.5 0 0 1 1767 88ZM1976 88h154v22.5A22.5 22.5 0 0 1 2107.5 133h-154V110.5A22.5 22.5 0 0 1 1976 88ZM2019.25 165.5h45v100a22.5 22.5 0 0 1 -22.5 22.5h-22.5Z',
} as const;

/** "N." monogram: white N on a rounded brand-blue tile with a red full stop on the baseline. */
const MARK = {
  viewBox: '0 0 64 64',
  tile: 'M14 0H50A14 14 0 0 1 64 14V50A14 14 0 0 1 50 64H14A14 14 0 0 1 0 50V14A14 14 0 0 1 14 0Z',
  letter: 'M14 13h6L34 38.15V13h8V47a4 4 0 0 1 -4 4H32L18 25.85V51H10V17a4 4 0 0 1 4 -4Z',
  stop: 'M46 43h8v8H46Z',
} as const;

/** Knock-out version of the mark for the single-colour tone (tile with the N and stop cut out). */
const MARK_KNOCKOUT = `${MARK.tile}${MARK.letter}${MARK.stop}`;

const DEFAULT_CLASS = {
  word: 'h-9 w-auto shrink-0',
  mark: 'size-9 shrink-0',
} as const;

function wordFills(tone: LogoTone): readonly [nexxa: string, craft: string] {
  if (tone === 'mono') return ['currentColor', 'currentColor'];
  if (tone === 'inverse') return [WHITE, RED_ON_DARK];
  return [BLUE, RED];
}

/** Named image when titled; hidden from assistive tech when decorative. */
function a11yProps(title: string) {
  return title
    ? ({ role: 'img', 'aria-label': title } as const)
    : ({ 'aria-hidden': true, focusable: 'false' } as const);
}

/**
 * nexxacrafts logo. Use `full` as the default brand signature, `wordmark` where height is scarce
 * (desktop header), `mark` for compact spaces. Use `tone="inverse"` on ink/dark surfaces.
 *
 * @example <Logo className="h-9 w-auto" />
 * @example <Logo variant="wordmark" tone="inverse" className="h-7 w-auto" />
 */
export function Logo({ variant = 'full', tone = 'color', className, title = 'nexxacrafts' }: LogoProps) {
  if (variant === 'mark') return <LogoMark tone={tone} className={className} title={title} />;

  const art = variant === 'wordmark' ? WORDMARK : FULL;
  const [nexxaFill, craftFill] = wordFills(tone);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={art.viewBox}
      className={className ?? DEFAULT_CLASS.word}
      {...a11yProps(title)}
    >
      {title ? <title>{title}</title> : null}
      <path fill={nexxaFill} d={art.nexxa} />
      <path fill={craftFill} d={art.craft} />
    </svg>
  );
}

/**
 * The "N." monogram on its tile. `inverse` swaps to a white tile with a blue N; `mono` is a
 * `currentColor` tile with the N and full stop knocked out.
 *
 * @example <LogoMark className="size-8" />
 */
export function LogoMark({ tone = 'color', className, title = 'nexxacrafts' }: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={MARK.viewBox}
      className={className ?? DEFAULT_CLASS.mark}
      {...a11yProps(title)}
    >
      {title ? <title>{title}</title> : null}
      {tone === 'mono' ? (
        <path fill="currentColor" fillRule="evenodd" d={MARK_KNOCKOUT} />
      ) : (
        <>
          <path fill={tone === 'inverse' ? WHITE : BLUE} d={MARK.tile} />
          <path fill={tone === 'inverse' ? BLUE : WHITE} d={MARK.letter} />
          <path fill={RED} d={MARK.stop} />
        </>
      )}
    </svg>
  );
}
