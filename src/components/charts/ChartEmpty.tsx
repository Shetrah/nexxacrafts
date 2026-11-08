import { BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

/** Props for {@link ChartEmpty}. */
export interface ChartEmptyProps {
  /** What is missing, e.g. "No orders in this period". */
  label?: string;
  /** Optional second line explaining what will appear here. */
  description?: string;
  icon?: LucideIcon;
  /** Height to reserve (match the chart so the card does not jump when data arrives). */
  height?: number;
  /** Single-line variant for small slots such as sparklines. */
  compact?: boolean;
  className?: string;
}

/**
 * Empty state shown instead of a chart when there is no data or every value is zero.
 * It never draws placeholder marks: an empty dashboard must not look like a quiet one.
 */
export function ChartEmpty({
  label = 'No data yet',
  description,
  icon: Icon = BarChart3,
  height,
  compact = false,
  className,
}: ChartEmptyProps) {
  if (compact) {
    return (
      <div
        className={cx('flex items-center gap-1.5 text-xs text-slate-500', className)}
        style={height ? { minHeight: height } : undefined}
      >
        <Icon aria-hidden="true" size={14} strokeWidth={1.75} className="shrink-0 text-slate-400" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cx(
        'flex w-full flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 px-6 py-6 text-center',
        className,
      )}
      style={height ? { minHeight: height } : undefined}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-white text-slate-400 shadow-xs ring-1 ring-inset ring-line">
        <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {description && <p className="max-w-xs text-xs leading-relaxed text-slate-500">{description}</p>}
    </div>
  );
}
