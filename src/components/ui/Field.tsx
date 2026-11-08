import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { isAriaInvalid, joinIds } from './internal/aria';

/** Props Field reads from / injects into its control. */
interface FieldControlProps {
  id?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
}

export interface FieldProps {
  /** Visible label (always rendered; visually hidden with `labelHidden`). */
  label: ReactNode;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error message. Marks the control invalid and links the message via aria-describedby. */
  error?: string;
  /** Shows a required marker and sets `required` on the control. */
  required?: boolean;
  /** Shows an "Optional" marker (ignored when `required`). */
  optional?: boolean;
  className?: string;
  /** Exactly one control: Input, Select, Textarea, NumberField, OptionGroup, FileDropzone, or a native element. */
  children: ReactElement;
  /** Keep the label for assistive technology but hide it visually. */
  labelHidden?: boolean;
}

/**
 * Label + control + hint + error, wired for accessibility. The single child is cloned with `id`
 * (generated unless it already has one), `aria-labelledby`, `aria-describedby` (hint + error),
 * `aria-invalid` and `required`.
 *
 * @example
 * <Field label="Email" hint="We send order updates here." error={errors.email} required>
 *   <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
 * </Field>
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  optional = false,
  className,
  children,
  labelHidden = false,
}: FieldProps) {
  const generatedId = useId();
  const child = Children.only(children);
  const childProps: FieldControlProps = isValidElement<FieldControlProps>(child) ? child.props : {};

  const controlId = childProps.id || `${generatedId}control`;
  const labelId = `${controlId}-label`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const invalid = Boolean(error) || isAriaInvalid(childProps['aria-invalid']);

  const control = cloneElement(child as ReactElement<FieldControlProps>, {
    id: controlId,
    required: required || childProps.required || undefined,
    'aria-labelledby': joinIds(labelId, childProps['aria-labelledby']),
    'aria-describedby': joinIds(childProps['aria-describedby'], hintId, errorId),
    'aria-invalid': invalid || undefined,
  });

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className={cn('flex items-baseline justify-between gap-3', labelHidden && 'sr-only')}>
        <label id={labelId} htmlFor={controlId} className="text-sm font-medium leading-5 text-slate-900">
          {label}
          {required && (
            <>
              <span aria-hidden="true" className="ml-0.5 text-danger-600">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
        {optional && !required && <span className="text-xs leading-5 text-slate-500">Optional</span>}
      </div>
      {control}
      {hint && (
        <p id={hintId} className="text-xs leading-5 text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium leading-5 text-danger-700">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
