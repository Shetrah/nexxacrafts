import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  /** What is empty, e.g. "No orders yet". */
  title: ReactNode;
  /** What will appear here and how to get started. */
  description?: ReactNode;
  /** Primary next step (Button / ButtonLink). */
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** sm (inside cards/tables) · md (default) · lg (whole page) */
  size?: 'sm' | 'md' | 'lg';
  /** plain (default) · dashed (bordered drop-zone look for standalone areas) */
  tone?: 'plain' | 'dashed';
  /** Heading element for the title (default h3). */
  titleAs?: 'h2' | 'h3' | 'h4' | 'p';
  className?: string;
}

const SIZES = {
  sm: { box: 'px-4 py-8', icon: 'size-10 [&>svg]:size-5', title: 'text-sm', gap: 'mt-3' },
  md: { box: 'px-6 py-12', icon: 'size-11 [&>svg]:size-5', title: 'text-base', gap: 'mt-4' },
  lg: { box: 'px-6 py-16 sm:py-20', icon: 'size-12 [&>svg]:size-6', title: 'text-lg', gap: 'mt-5' },
} as const;

/**
 * Explains an empty view and offers the next step.
 *
 * @example <EmptyState icon={<Inbox />} title="No quotes yet" description="Quotes you request appear here with their status." action={<ButtonLink to="/quote">Request a quote</ButtonLink>} />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  tone = 'plain',
  titleAs: Title = 'h3',
  className,
}: EmptyStateProps) {
  const styles = SIZES[size];
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        styles.box,
        tone === 'dashed' && 'rounded-xl border border-dashed border-line-strong bg-white',
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            'grid shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-xs ring-1 ring-line',
            styles.icon,
          )}
        >
          {icon}
        </span>
      )}
      <Title className={cn('font-display font-bold leading-6 tracking-tight text-[color:var(--nc-heading)]', Boolean(icon) && styles.gap, styles.title)}>
        {title}
      </Title>
      {description && <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-600">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
