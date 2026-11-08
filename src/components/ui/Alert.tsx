import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface AlertProps {
  /** info (default) · success · warning · danger · neutral */
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Replaces the tone icon. */
  icon?: ReactNode;
  /** A button or link (e.g. "Retry"), right-aligned on wide screens. */
  action?: ReactNode;
  /** Shows a dismiss button. */
  onDismiss?: () => void;
  className?: string;
}

const TONES: Record<AlertTone, { box: string; icon: string; title: string; body: string }> = {
  info: { box: 'border-info-200 bg-info-50', icon: 'text-info-600', title: 'text-info-900', body: 'text-info-800' },
  success: {
    box: 'border-success-200 bg-success-50',
    icon: 'text-success-600',
    title: 'text-success-900',
    body: 'text-success-800',
  },
  warning: {
    box: 'border-warning-200 bg-warning-50',
    icon: 'text-warning-600',
    title: 'text-warning-900',
    body: 'text-warning-800',
  },
  danger: { box: 'border-danger-200 bg-danger-50', icon: 'text-danger-600', title: 'text-danger-900', body: 'text-danger-800' },
  neutral: { box: 'border-line bg-slate-50', icon: 'text-slate-500', title: 'text-slate-900', body: 'text-slate-700' },
};

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  neutral: Info,
} as const;

/**
 * Inline message. Danger alerts use `role="alert"` (announced immediately); others use
 * `role="status"`.
 *
 * @example <Alert tone="danger" title="We couldn't place your order">Check the highlighted fields and try again.</Alert>
 */
export function Alert({ tone = 'info', title, children, icon, action, onDismiss, className }: AlertProps) {
  const styles = TONES[tone];
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm leading-5', styles.box, className)}
    >
      <span aria-hidden="true" className={cn('mt-px inline-flex shrink-0 [&>svg]:size-[18px]', styles.icon)}>
        {icon ?? <Icon />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {title && <p className={cn('font-semibold', styles.title)}>{title}</p>}
          {children && <div className={cn(styles.body, Boolean(title) && 'mt-1')}>{children}</div>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2 sm:-my-1">{action}</div>}
      </div>
      {onDismiss && (
        <IconButton label="Dismiss" icon={<X />} size="sm" onClick={onDismiss} className="-my-1 -mr-2" />
      )}
    </div>
  );
}
