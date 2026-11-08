import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TimelineState = 'complete' | 'current' | 'upcoming' | 'cancelled';

export interface TimelineItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Timestamp or relative time, e.g. "7 Nov, 14:20". */
  time?: ReactNode;
  state: TimelineState;
  /** Replaces the default state marker icon. */
  icon?: ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const STATE_LABEL: Record<TimelineState, string> = {
  complete: 'Completed',
  current: 'In progress',
  upcoming: 'Upcoming',
  cancelled: 'Cancelled',
};

function Marker({ state, icon }: { state: TimelineState; icon?: ReactNode }) {
  const base = 'relative z-10 grid size-6 shrink-0 place-items-center rounded-full [&>svg]:size-3.5';
  if (state === 'complete') {
    return (
      <span aria-hidden="true" className={cn(base, 'bg-brand-600 text-white')}>
        {icon ?? <Check className="[stroke-width:2.75]" />}
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span aria-hidden="true" className={cn(base, 'bg-white text-brand-700 ring-2 ring-brand-600')}>
        {icon ?? <span className="size-2 rounded-full bg-brand-600" />}
      </span>
    );
  }
  if (state === 'cancelled') {
    return (
      <span aria-hidden="true" className={cn(base, 'bg-danger-50 text-danger-600 ring-1 ring-inset ring-danger-200')}>
        {icon ?? <X className="[stroke-width:2.5]" />}
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn(base, 'bg-white text-slate-400 ring-1 ring-inset ring-line-strong')}>
      {icon ?? <span className="size-1.5 rounded-full bg-slate-300" />}
    </span>
  );
}

/**
 * Vertical event history (order progress, audit trail). States are announced in text, not only
 * by colour.
 *
 * @example <Timeline items={[{ id: 'paid', title: 'Payment received', time: '7 Nov, 14:20', state: 'complete' }]} />
 */
export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('min-w-0', className)}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const muted = item.state === 'upcoming' || item.state === 'cancelled';
        return (
          <li
            key={item.id}
            aria-current={item.state === 'current' ? 'step' : undefined}
            className={cn('relative flex gap-3', !last && 'pb-6')}
          >
            {!last && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute bottom-0 left-[11.5px] top-7 w-px',
                  item.state === 'complete' ? 'bg-brand-600/40' : 'bg-line-strong',
                )}
              />
            )}
            <Marker state={item.state} icon={item.icon} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p
                  className={cn(
                    'text-sm font-medium leading-6',
                    muted ? 'text-slate-500' : 'text-slate-900',
                    item.state === 'cancelled' && 'line-through decoration-slate-400',
                  )}
                >
                  <span className="sr-only">{STATE_LABEL[item.state]}: </span>
                  {item.title}
                </p>
                {item.time && (
                  <span className="shrink-0 font-mono text-xs leading-6 text-slate-500 tabular-nums">{item.time}</span>
                )}
              </div>
              {item.description && <div className="mt-0.5 text-sm leading-5 text-slate-600">{item.description}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
