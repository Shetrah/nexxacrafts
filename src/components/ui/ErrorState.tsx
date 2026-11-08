import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { getErrorMessage } from './errorMessage';

export interface ErrorStateProps {
  /** Default "Something went wrong". */
  title?: ReactNode;
  /** Anything thrown or returned (Error, PostgREST error, string). Stack traces are never shown. */
  error: unknown;
  /** Shows a "Try again" button. */
  onRetry?: () => void;
  /** Inline row (inside cards, tables) instead of a centred block. */
  compact?: boolean;
  className?: string;
}

/**
 * Load-failure state with a human-readable message and an optional retry.
 *
 * @example {error ? <ErrorState error={error} onRetry={reload} /> : <DataTable … />}
 */
export function ErrorState({ title = 'Something went wrong', error, onRetry, compact = false, className }: ErrorStateProps) {
  const message = getErrorMessage(error);

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col gap-3 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm leading-5 sm:flex-row sm:items-center',
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <AlertTriangle aria-hidden="true" className="mt-px size-[18px] shrink-0 text-danger-600" />
          <p className="min-w-0 text-danger-800">
            <span className="font-semibold text-danger-900">{title}.</span> {message}
          </p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw />} onClick={onRetry} className="self-start sm:self-auto">
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-xl bg-danger-50 text-danger-600 ring-1 ring-inset ring-danger-200 [&>svg]:size-5"
      >
        <AlertTriangle />
      </span>
      <p className="mt-4 font-display text-base font-bold leading-6 tracking-tight text-slate-900">{title}</p>
      <p className="mt-1.5 max-w-md break-words text-sm leading-6 text-slate-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" leftIcon={<RefreshCw />} onClick={onRetry} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  );
}
