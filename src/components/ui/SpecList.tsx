import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SpecListItem {
  label: ReactNode;
  value: ReactNode;
  /** Typeset the value in JetBrains Mono (references, dimensions, codes). */
  mono?: boolean;
}

export interface SpecListProps {
  items: SpecListItem[];
  /** Two columns from `sm` up. */
  columns?: 1 | 2;
  /** Tighter rows for sidebars and summaries. */
  dense?: boolean;
  /** Dotted leaders between label and value (production-docket style) instead of row rules. */
  leaders?: boolean;
  className?: string;
}

/**
 * Key/value rows typeset like a production docket — order configurations, job sheets, checkout
 * summaries.
 *
 * @example
 * <SpecList leaders items={[
 *   { label: 'Reference', value: 'NCO-261107-AB12C', mono: true },
 *   { label: 'Size', value: '2.40 × 1.20 m', mono: true },
 *   { label: 'Material', value: 'Premium frontlit' },
 * ]} />
 */
export function SpecList({ items, columns = 1, dense = false, leaders = false, className }: SpecListProps) {
  return (
    <div className={cn('min-w-0', !leaders && 'overflow-hidden', className)}>
      <dl
        className={cn(
          'grid',
          columns === 2 && 'sm:grid-cols-2 sm:gap-x-8',
          // Row rules are drawn on each row's bottom edge; the wrapper clips the last one.
          !leaders && '-mb-px',
        )}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              'flex min-w-0 items-baseline gap-3',
              dense ? 'py-1.5 text-[13px] leading-5' : 'py-2.5 text-sm leading-5',
              !leaders && 'border-b border-line',
            )}
          >
            <dt
              className={cn(
                'text-slate-600',
                leaders
                  ? "flex min-w-0 flex-1 items-baseline gap-2 after:min-w-4 after:flex-1 after:-translate-y-[0.2em] after:border-b after:border-dotted after:border-slate-300 after:content-['']"
                  : 'min-w-0',
              )}
            >
              <span className={cn(leaders && 'shrink-0')}>{item.label}</span>
            </dt>
            <dd
              className={cn(
                'min-w-0 break-words text-right font-medium text-slate-900',
                !leaders && 'ml-auto',
                leaders && 'max-w-[65%] shrink-0',
                item.mono && 'font-mono text-[0.93em] tracking-tight',
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
