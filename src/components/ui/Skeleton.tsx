import { cn } from '@/lib/cn';

export interface SkeletonProps {
  /** Size and shape, e.g. "h-4 w-32" or "size-10 rounded-full". Defaults to a full-width text line. */
  className?: string;
}

/**
 * Placeholder block shown while content loads. Decorative (aria-hidden): mark the loading region
 * with `aria-busy` or use <LoadingState> for an announced label.
 *
 * @example <Skeleton className="h-4 w-40" />
 */
export function Skeleton({ className }: SkeletonProps) {
  // Defaults are only applied when not overridden (cn() does not resolve conflicting utilities).
  const shape = className && /(^|\s)rounded/.test(className) ? '' : 'rounded-md';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-pulse bg-slate-200/70 motion-reduce:animate-none',
        shape,
        className ?? 'h-4 w-full',
      )}
    />
  );
}
