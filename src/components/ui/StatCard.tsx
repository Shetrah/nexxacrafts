import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Skeleton';

export interface StatTrend {
  /** e.g. "+12% vs last month" — from real data only. */
  label: string;
  direction: 'up' | 'down' | 'flat';
  /** Colour meaning (default neutral): up is not always good (e.g. overdue invoices). */
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Small supporting line under the value. */
  hint?: ReactNode;
  icon?: ReactNode;
  trend?: StatTrend;
  /** Makes the whole tile a link (e.g. to the filtered list). */
  to?: string;
  loading?: boolean;
  /** attention: amber accent for figures that need action (e.g. quotes awaiting review). */
  tone?: 'default' | 'attention';
  className?: string;
}

const TREND_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight } as const;
const TREND_WORD = { up: 'Up', down: 'Down', flat: 'No change' } as const;
const SENTIMENT = {
  positive: 'text-success-700',
  negative: 'text-danger-700',
  neutral: 'text-slate-600',
} as const;

/**
 * KPI tile with tabular figures.
 *
 * @example <StatCard label="Open orders" value={12} hint="3 due this week" icon={<ShoppingBag />} to="/admin/orders?status=open" />
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  to,
  loading = false,
  tone = 'default',
  className,
}: StatCardProps) {
  const attention = tone === 'attention';
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium leading-5 text-slate-600">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset [&>svg]:size-4',
              attention ? 'bg-warning-50 text-warning-700 ring-warning-600/20' : 'bg-slate-50 text-slate-500 ring-line',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-[1.75rem] font-semibold leading-9 tracking-tight text-slate-900 tabular-nums">
        {loading ? <Skeleton className="my-1.5 h-6 w-24" /> : value}
      </div>
      {(loading || trend || hint) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5">
          {loading ? (
            <Skeleton className="my-1 h-3 w-32" />
          ) : (
            <>
              {trend && TrendIcon && (
                <span className={cn('inline-flex items-center gap-0.5 font-medium', SENTIMENT[trend.sentiment ?? 'neutral'])}>
                  <TrendIcon aria-hidden="true" className="size-3.5" />
                  <span className="sr-only">{TREND_WORD[trend.direction]}: </span>
                  {trend.label}
                </span>
              )}
              {hint && <span className="text-slate-500">{hint}</span>}
            </>
          )}
        </div>
      )}
    </>
  );

  const surface = cn(
    'surface-light relative block min-w-0 rounded-xl border p-5 shadow-xs',
    attention ? 'border-warning-300 bg-warning-50/40' : 'border-line bg-white',
    className,
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-busy={loading || undefined}
        className={cn(
          surface,
          'group transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none',
          attention ? 'hover:border-warning-400' : 'hover:border-line-strong',
        )}
      >
        {body}
        <ArrowUpRight
          aria-hidden="true"
          className="absolute bottom-5 right-5 size-4 text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </Link>
    );
  }

  return (
    <div aria-busy={loading || undefined} className={surface}>
      {body}
    </div>
  );
}
