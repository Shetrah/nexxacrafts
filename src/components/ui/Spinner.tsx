import { cn } from '@/lib/cn';

export interface SpinnerProps {
  /** xs 14px · sm 16px · md 20px (default) · lg 24px. */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /**
   * Accessible label. When set, the spinner is announced as a status ("Loading orders…");
   * without it the spinner is decorative (e.g. inside a busy button).
   */
  label?: string;
  className?: string;
}

const SIZES = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const;

/** Circular progress indicator. Inherits the current text colour. */
export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const svg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('animate-spin', SIZES[size], !label && className)}
    >
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.5" />
      <path d="M21.25 12A9.25 9.25 0 0 0 12 2.75" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  if (!label) return svg;

  return (
    <span role="status" className={cn('inline-flex', className)}>
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
