import { cn } from '@/lib/cn';
import { Skeleton } from './Skeleton';
import { Spinner } from './Spinner';

export interface LoadingStateProps {
  /** Announced and (for the spinner variant) shown, e.g. "Loading orders…". Default "Loading…". */
  label?: string;
  /** spinner (default) · skeleton (text lines) */
  variant?: 'spinner' | 'skeleton';
  /** Number of skeleton lines (default 3). */
  rows?: number;
  className?: string;
}

const LINE_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-3/4', 'w-1/2'];

/**
 * Region placeholder while data loads (`role="status"`, `aria-busy`).
 *
 * @example {loading ? <LoadingState label="Loading orders…" /> : …}
 */
export function LoadingState({ label = 'Loading…', variant = 'spinner', rows = 3, className }: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div role="status" aria-busy="true" className={cn('space-y-3 py-2', className)}>
        <span className="sr-only">{label}</span>
        {Array.from({ length: Math.max(1, rows) }, (_, index) => (
          <Skeleton key={index} className={cn('h-4', LINE_WIDTHS[index % LINE_WIDTHS.length])} />
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      className={cn('flex min-h-[10rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}
    >
      <Spinner size="lg" className="text-brand-600" />
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}
