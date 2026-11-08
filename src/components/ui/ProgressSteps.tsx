import { cn } from '@/lib/cn';

export interface ProgressStepsProps {
  /** Step labels in order, e.g. ['Submitted', 'In review', 'In production', 'Ready', 'Delivered']. */
  steps: string[];
  /** 0-based index of the current step. */
  current: number;
  /** active (default) · cancelled (stopped at `current`) · complete (every step done). */
  state?: 'active' | 'cancelled' | 'complete';
  /** md (default): labels under the bar from `sm` up · sm: bar + one-line caption (table cells). */
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

type StepState = 'complete' | 'current' | 'upcoming' | 'cancelled';

const STATE_TEXT: Record<StepState, string> = {
  complete: 'completed',
  current: 'current step',
  upcoming: 'not started',
  cancelled: 'cancelled',
};

const SEGMENT: Record<StepState, string> = {
  complete: 'bg-brand-600',
  current: 'bg-brand-600',
  upcoming: 'bg-slate-200',
  cancelled: 'bg-danger-500',
};

/**
 * Compact horizontal progress tracker for order and job status. Below `sm` (and at size="sm")
 * it shows only the current label with "Step x of n".
 *
 * @example <ProgressSteps steps={orderSteps} current={orderSteps.indexOf('In production')} />
 */
export function ProgressSteps({
  steps,
  current,
  state = 'active',
  size = 'md',
  ariaLabel = 'Progress',
  className,
}: ProgressStepsProps) {
  const count = steps.length;
  if (count === 0) return null;
  const index = state === 'complete' ? count - 1 : Math.min(Math.max(current, 0), count - 1);

  const stepState = (step: number): StepState => {
    if (state === 'complete' || step < index) return 'complete';
    if (step === index) return state === 'cancelled' ? 'cancelled' : 'current';
    return 'upcoming';
  };

  const caption =
    state === 'complete'
      ? `${steps[count - 1]} · all ${count} steps complete`
      : state === 'cancelled'
        ? `Cancelled at ${steps[index]} · step ${index + 1} of ${count}`
        : `Step ${index + 1} of ${count} · ${steps[index]}`;

  return (
    <div className={cn('min-w-0', className)}>
      <ol aria-label={ariaLabel} className="sr-only">
        {steps.map((step, position) => (
          <li key={`${step}-${position}`} aria-current={stepState(position) === 'current' ? 'step' : undefined}>
            {step}: {STATE_TEXT[stepState(position)]}
          </li>
        ))}
      </ol>

      <div aria-hidden="true">
        <div className="flex gap-1">
          {steps.map((step, position) => (
            <span
              key={`${step}-${position}`}
              className={cn(
                'flex-1 rounded-full',
                size === 'sm' ? 'h-1' : 'h-1.5',
                state === 'cancelled' && position < index ? 'bg-slate-300' : SEGMENT[stepState(position)],
              )}
            />
          ))}
        </div>

        <p
          className={cn(
            'mt-2 truncate text-xs leading-4',
            state === 'cancelled' ? 'text-danger-700' : 'text-slate-600',
            size === 'md' && 'sm:hidden',
          )}
        >
          {caption}
        </p>

        {size === 'md' && (
          <div
            className="mt-2 hidden gap-1 sm:grid"
            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
          >
            {steps.map((step, position) => {
              const status = stepState(position);
              return (
                <span
                  key={`${step}-${position}`}
                  title={step}
                  className={cn(
                    'truncate text-xs leading-4',
                    status === 'current' && 'font-semibold text-slate-900',
                    status === 'cancelled' && 'font-semibold text-danger-700',
                    status === 'complete' && 'text-slate-600',
                    status === 'upcoming' && 'text-slate-500',
                  )}
                >
                  {step}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
