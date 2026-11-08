import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BadgeTone } from './types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** neutral (default) · brand · info · success · warning · danger · violet */
  tone?: BadgeTone;
  /** Leading status dot. */
  dot?: boolean;
  /** sm 20px · md 24px (default) */
  size?: 'sm' | 'md';
  /** Leading icon (14px). */
  icon?: ReactNode;
  children: ReactNode;
}

const TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-slate-100 text-slate-700 ring-slate-500/15', dot: 'bg-slate-500' },
  brand: { badge: 'bg-brand-50 text-brand-700 ring-brand-600/15', dot: 'bg-brand-600' },
  info: { badge: 'bg-info-50 text-info-700 ring-info-600/20', dot: 'bg-info-500' },
  success: { badge: 'bg-success-50 text-success-700 ring-success-600/20', dot: 'bg-success-500' },
  warning: { badge: 'bg-warning-50 text-warning-800 ring-warning-600/25', dot: 'bg-warning-500' },
  danger: { badge: 'bg-danger-50 text-danger-700 ring-danger-600/15', dot: 'bg-danger-500' },
  violet: { badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500' },
};

const SIZES = {
  sm: 'h-5 gap-1 px-1.5 text-[11px] leading-4',
  md: 'h-6 gap-1.5 px-2 text-xs leading-4',
} as const;

/**
 * Compact label for categories, counts and states (6px radius, tinted background, inset ring).
 *
 * @example <Badge tone="brand">Instant estimate</Badge>
 */
export function Badge({ tone = 'neutral', dot = false, size = 'md', icon, className, children, ...rest }: BadgeProps) {
  const styles = TONES[tone];
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-md font-medium tabular-nums ring-1 ring-inset',
        SIZES[size],
        styles.badge,
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', styles.dot)} />}
      {icon && (
        <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-3.5">
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

export interface StatusBadgeProps {
  tone: BadgeTone;
  label: string;
  /** Longer explanation, shown as a native tooltip. */
  title?: string;
  /** Same as `title`; lets `{...statusMeta(kind, value)}` be spread in directly. */
  description?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Status indicator: dot + label. Domain statuses come from `statusMeta(kind, value)` in
 * src/lib/status.ts, which returns { label, tone, description } — spread it in.
 *
 * @example <StatusBadge tone="warning" label="Awaiting payment" />
 * @example <StatusBadge {...statusMeta('order', order.status)} />
 */
export function StatusBadge({ tone, label, title, description, size = 'md', className }: StatusBadgeProps) {
  return (
    <Badge tone={tone} size={size} dot title={title ?? description} className={className}>
      {label}
    </Badge>
  );
}
