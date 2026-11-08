import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { isAriaInvalid } from './internal/aria';
import { controlSurfaceClasses } from './internal/controlStyles';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error styling. Also inferred from `aria-invalid` (set automatically inside <Field error>). */
  invalid?: boolean;
}

/** Multi-line text input (4 rows by default, vertically resizable). */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, rows = 4, className, 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  const isInvalid = invalid ?? isAriaInvalid(ariaInvalid);
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={rows}
      aria-invalid={isInvalid || undefined}
      className={cn(
        'block min-h-[5.5rem] w-full resize-y rounded-lg px-3 py-2 text-base leading-6 text-slate-900 sm:text-sm sm:leading-6',
        controlSurfaceClasses(isInvalid),
        className,
      )}
    />
  );
});
