import { cn } from '@/lib/cn';
import type { ControlSize } from './types';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'subtle'
  | 'danger'
  | 'inverse'
  | 'inverse-outline'
  | 'link';

export type ButtonSize = ControlSize;

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Dimmed, no hover/press feedback. */
  disabled?: boolean;
  /** Busy: keeps full colour, wait cursor, no hover/press feedback. */
  loading?: boolean;
  className?: string;
}

const BASE =
  'relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out motion-reduce:transition-none';

const SIZES: Record<ButtonSize, string> = {
  sm: 'tap-target h-8 gap-1.5 rounded-md px-3 text-[13px] leading-5',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm leading-5',
  lg: 'h-12 gap-2 rounded-lg px-5 text-base leading-6',
};

const LINK_SIZES: Record<ButtonSize, string> = {
  sm: 'gap-1 text-[13px] leading-5',
  md: 'gap-1.5 text-sm leading-5',
  lg: 'gap-2 text-base leading-6',
};

/** Resting look + interactive feedback (only applied when the button can be used). */
const VARIANTS: Record<ButtonVariant, { base: string; interactive: string }> = {
  primary: {
    base: 'border border-transparent bg-brand-600 text-white shadow-xs',
    interactive: 'hover:bg-brand-700 active:bg-brand-800',
  },
  secondary: {
    base: 'border border-line-strong bg-white text-slate-900 shadow-xs',
    interactive: 'hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  },
  ghost: {
    base: 'border border-transparent bg-transparent text-slate-700',
    interactive: 'hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70',
  },
  subtle: {
    base: 'border border-transparent bg-brand-50 text-brand-700',
    interactive: 'hover:bg-brand-100 hover:text-brand-800 active:bg-brand-200/70',
  },
  danger: {
    base: 'border border-transparent bg-danger-600 text-white shadow-xs',
    interactive: 'hover:bg-danger-700 active:bg-danger-800',
  },
  inverse: {
    base: 'border border-transparent bg-white text-ink-900 shadow-xs focus-visible:outline-white',
    interactive: 'hover:bg-slate-100 active:bg-slate-200',
  },
  'inverse-outline': {
    base: 'border border-white/30 bg-transparent text-white focus-visible:outline-white',
    interactive: 'hover:border-white/50 hover:bg-white/10 active:bg-white/15',
  },
  link: {
    base: 'rounded-sm text-brand-600 underline-offset-4',
    interactive: 'hover:text-brand-700 hover:underline',
  },
};

/**
 * Class string for a button-styled element. Use it to make a `<label>`, `<a>` or `<summary>` look
 * exactly like a Button:
 *
 * @example <label htmlFor="file" className={buttonClasses({ variant: 'secondary' })}>Browse</label>
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  className,
}: ButtonClassOptions = {}): string {
  const styles = VARIANTS[variant];
  const isLink = variant === 'link';
  const usable = !disabled && !loading;
  return cn(
    BASE,
    isLink ? LINK_SIZES[size] : SIZES[size],
    styles.base,
    usable && styles.interactive,
    usable && !isLink && 'cursor-pointer active:translate-y-px motion-reduce:active:translate-y-0',
    usable && isLink && 'cursor-pointer',
    disabled && 'cursor-not-allowed opacity-50',
    loading && 'cursor-wait',
    fullWidth && 'w-full',
    className,
  );
}

/** Icon slot sizing per button size (16px small, 18px default). */
export const BUTTON_ICON: Record<ButtonSize, string> = {
  sm: '[&>svg]:size-4',
  md: '[&>svg]:size-[18px]',
  lg: '[&>svg]:size-[18px]',
};
