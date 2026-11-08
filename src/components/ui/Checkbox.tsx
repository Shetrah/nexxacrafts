import { forwardRef, useEffect, useId, useMemo, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { isAriaInvalid, joinIds } from './internal/aria';
import { mergeRefs } from './internal/mergeRefs';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Visible label (clicking it toggles the checkbox). */
  label: ReactNode;
  /** Secondary text under the label, linked via aria-describedby. */
  description?: ReactNode;
  /** Mixed state, e.g. a "select all" box with some rows selected. */
  indeterminate?: boolean;
  /** Error styling. Also inferred from `aria-invalid`. */
  invalid?: boolean;
}

/**
 * Checkbox with label and optional description.
 *
 * @example <Checkbox label="Lamination" description="Matte film, adds 1 day" checked={laminate} onChange={(e) => setLaminate(e.target.checked)} />
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    indeterminate = false,
    invalid,
    className,
    id,
    disabled = false,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}checkbox`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const innerRef = useRef<HTMLInputElement>(null);
  const setRefs = useMemo(() => mergeRefs(innerRef, ref), [ref]);
  const isInvalid = invalid ?? isAriaInvalid(ariaInvalid);

  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-60', className)}>
      <span className="relative mt-0.5 flex size-4 shrink-0">
        <input
          {...rest}
          ref={setRefs}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={joinIds(ariaDescribedBy, descriptionId)}
          className={cn(
            'peer size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border bg-white shadow-xs transition-colors duration-150 ease-out motion-reduce:transition-none',
            'checked:border-brand-600 checked:bg-brand-600 indeterminate:border-brand-600 indeterminate:bg-brand-600',
            'disabled:cursor-not-allowed',
            isInvalid ? 'border-danger-500' : 'border-slate-400 hover:border-slate-500',
          )}
        />
        <Check
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-white [stroke-width:3] peer-checked:block peer-indeterminate:hidden"
        />
        <Minus
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-white [stroke-width:3] peer-indeterminate:block"
        />
      </span>
      <div className="min-w-0">
        <label
          htmlFor={inputId}
          className={cn('block text-sm font-medium leading-5 text-slate-900', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-sm leading-5 text-slate-600">
            {description}
          </p>
        )}
      </div>
    </div>
  );
});
