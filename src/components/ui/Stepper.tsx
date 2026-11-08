import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface StepperStep {
  id: string;
  label: string;
  /** Shown under the label from `xl` up. */
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** 0-based index of the active step. */
  current: number;
  /** Makes completed (and reachable) steps clickable. */
  onStepClick?: (index: number) => void;
  /** Highest index the user may jump to (e.g. after going back). Defaults to `current`. */
  maxReachable?: number;
  ariaLabel?: string;
  className?: string;
}

type StepStatus = 'complete' | 'current' | 'upcoming';

/**
 * Numbered progress header for multi-step forms. Desktop: horizontal steps with connectors;
 * phones: "Step 2 of 4 · Label" with a progress bar.
 *
 * @example <Stepper steps={steps} current={step} onStepClick={setStep} />
 */
export function Stepper({ steps, current, onStepClick, maxReachable, ariaLabel = 'Progress', className }: StepperProps) {
  const count = steps.length;
  if (count === 0) return null;
  const active = Math.min(Math.max(current, 0), count - 1);
  const reachable = Math.max(active, maxReachable ?? active);
  const statusOf = (index: number): StepStatus =>
    index < active ? 'complete' : index === active ? 'current' : 'upcoming';

  return (
    <nav aria-label={ariaLabel} className={cn('min-w-0', className)}>
      <ol className="hidden items-center md:flex">
        {steps.map((step, index) => {
          const status = statusOf(index);
          const last = index === count - 1;
          const clickable = Boolean(onStepClick) && index !== active && index <= reachable;
          const visitedAhead = status === 'upcoming' && index <= reachable;

          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full font-mono text-[13px] font-medium transition-colors duration-150',
                  status === 'complete' && 'bg-brand-600 text-white',
                  status === 'current' && 'bg-white text-brand-700 ring-2 ring-brand-600',
                  status === 'upcoming' &&
                    (visitedAhead
                      ? 'bg-white text-brand-700 ring-1 ring-inset ring-brand-300'
                      : 'bg-white text-slate-500 ring-1 ring-inset ring-line-strong'),
                )}
              >
                {status === 'complete' ? <Check className="size-4 [stroke-width:2.5]" /> : index + 1}
              </span>
              <span className="min-w-0 text-left">
                <span
                  className={cn(
                    'block truncate text-sm leading-5',
                    status === 'upcoming' ? 'font-medium text-slate-500' : 'font-semibold text-slate-900',
                    clickable && 'group-hover:text-brand-700',
                  )}
                >
                  <span className="sr-only">
                    {status === 'complete' ? 'Completed: ' : status === 'current' ? 'Current step: ' : ''}
                  </span>
                  {step.label}
                </span>
                {step.description && (
                  <span className="hidden truncate text-xs leading-4 text-slate-500 xl:block">{step.description}</span>
                )}
              </span>
            </>
          );

          return (
            <li
              key={step.id}
              aria-current={status === 'current' ? 'step' : undefined}
              className={cn(
                'flex items-center',
                // Steps take their natural width and share the rest; only the current one never shrinks.
                !last && 'flex-auto',
                status === 'current' ? 'shrink-0' : 'min-w-0',
              )}
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  className={cn('group -m-1 flex items-center gap-3 rounded-lg p-1', status === 'current' ? 'shrink-0' : 'min-w-0')}
                >
                  {content}
                </button>
              ) : (
                <div className={cn('flex items-center gap-3', status === 'current' ? 'shrink-0' : 'min-w-0')}>{content}</div>
              )}
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn('mx-2.5 h-px min-w-4 flex-1', index < active ? 'bg-brand-600' : 'bg-line-strong')}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="md:hidden">
        <p className="flex min-w-0 items-baseline gap-2 text-sm leading-5">
          <span className="shrink-0 font-mono text-xs text-slate-500">
            Step {active + 1} of {count}
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="truncate font-semibold text-slate-900">{steps[active].label}</span>
        </p>
        <div
          role="progressbar"
          aria-label={ariaLabel}
          aria-valuemin={1}
          aria-valuemax={count}
          aria-valuenow={active + 1}
          aria-valuetext={`Step ${active + 1} of ${count}: ${steps[active].label}`}
          className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-200 ease-out motion-reduce:transition-none"
            style={{ width: `${((active + 1) / count) * 100}%` }}
          />
        </div>
      </div>
    </nav>
  );
}
