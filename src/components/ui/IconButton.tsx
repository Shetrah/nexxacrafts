import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { joinIds } from './internal/aria';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name. Also used as the native `title` tooltip unless `title` is passed. */
  label: string;
  /** The icon (a lucide icon; sized automatically). */
  icon: ReactNode;
  /** ghost (default) · secondary (bordered) · inverse (on dark surfaces) */
  variant?: 'ghost' | 'secondary' | 'inverse';
  /** sm 32px · md 40px (default) · lg 48px */
  size?: 'sm' | 'md' | 'lg';
  /** A count bubble (numbers > 99 show "99+") or, when `true`, a small dot. 0/false hide it. */
  badge?: number | boolean;
  /** Screen-reader description of the badge, e.g. "3 items in cart". Defaults to the count. */
  badgeLabel?: string;
}

const SIZES = {
  sm: 'tap-target size-8 rounded-md [&>span>svg]:size-4',
  md: 'size-10 rounded-lg [&>span>svg]:size-[18px]',
  lg: 'size-12 rounded-lg [&>span>svg]:size-5',
} as const;

const VARIANTS = {
  ghost: {
    base: 'border border-transparent text-slate-600',
    interactive: 'hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70',
    ring: 'ring-white',
  },
  secondary: {
    base: 'border border-line-strong bg-white text-slate-700 shadow-xs',
    interactive: 'hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100',
    ring: 'ring-white',
  },
  inverse: {
    base: 'border border-transparent text-slate-300 focus-visible:outline-white',
    interactive: 'hover:bg-white/10 hover:text-white active:bg-white/15',
    ring: 'ring-ink-900',
  },
} as const;

/**
 * Icon-only button. `label` is required and becomes the accessible name.
 *
 * @example <IconButton label="Open cart" icon={<ShoppingBag />} badge={count} />
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    variant = 'ghost',
    size = 'md',
    badge,
    badgeLabel,
    type = 'button',
    disabled = false,
    title,
    className,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const badgeId = useId();
  const styles = VARIANTS[variant];
  const count = typeof badge === 'number' && badge > 0 ? badge : null;
  const showDot = badge === true;
  const description = badgeLabel ?? (count !== null ? String(count) : undefined);

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      aria-describedby={joinIds(ariaDescribedBy, (count !== null || showDot) && description ? badgeId : undefined)}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center transition-[background-color,border-color,color] duration-150 ease-out motion-reduce:transition-none',
        SIZES[size],
        styles.base,
        disabled ? 'cursor-not-allowed opacity-50' : cn('cursor-pointer', styles.interactive),
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
      {count !== null && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 tabular-nums',
            styles.ring,
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      {showDot && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute right-1.5 top-1.5 size-2 rounded-full bg-accent-600 ring-2',
            styles.ring,
          )}
        />
      )}
      {(count !== null || showDot) && description && (
        <span id={badgeId} className="sr-only">
          {description}
        </span>
      )}
    </button>
  );
});
