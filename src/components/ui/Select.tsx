import { forwardRef, useState, type ChangeEvent, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ControlSize } from './types';
import { isAriaInvalid } from './internal/aria';
import { controlHeight, controlSurfaceClasses, controlText } from './internal/controlStyles';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Error styling. Also inferred from `aria-invalid` (set automatically inside <Field error>). */
  invalid?: boolean;
  /** sm 32px · md 40px (default) · lg 48px */
  size?: ControlSize;
  /** Adds an empty first option (value ""). It cannot be re-selected when `required`. */
  placeholder?: string;
  /** Options; `children` (<option>/<optgroup>) are rendered after them. */
  options?: SelectOption[];
  /** Classes for the native <select> (className styles the wrapper). */
  selectClassName?: string;
}

const PADDING: Record<ControlSize, string> = {
  sm: 'pl-2.5 pr-8',
  md: 'pl-3 pr-9',
  lg: 'pl-4 pr-10',
};

/**
 * Native select with the system chevron replaced. Native keeps mobile pickers and accessibility.
 *
 * @example <Select placeholder="Choose a material" options={materials} value={material} onChange={(e) => setMaterial(e.target.value)} />
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    invalid,
    size = 'md',
    placeholder,
    options,
    className,
    selectClassName,
    children,
    value,
    defaultValue,
    onChange,
    required,
    'aria-invalid': ariaInvalid,
    ...rest
  },
  ref,
) {
  const isInvalid = invalid ?? isAriaInvalid(ariaInvalid);
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(() =>
    typeof defaultValue === 'string' ? defaultValue : '',
  );
  const current = value !== undefined ? value : uncontrolledValue;
  const showingPlaceholder = placeholder !== undefined && (current === '' || current === null);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (value === undefined) setUncontrolledValue(event.target.value);
    onChange?.(event);
  };

  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <select
        {...rest}
        ref={ref}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={handleChange}
        required={required}
        aria-invalid={isInvalid || undefined}
        className={cn(
          'block w-full cursor-pointer appearance-none truncate disabled:cursor-not-allowed',
          controlHeight[size],
          controlText[size],
          PADDING[size],
          controlSurfaceClasses(isInvalid),
          showingPlaceholder ? 'text-slate-500' : 'text-slate-900',
          '[&>option]:text-slate-900',
          selectClassName,
        )}
      >
        {placeholder !== undefined && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-500',
          size === 'lg' ? 'right-3.5' : 'right-2.5',
        )}
      />
    </div>
  );
});
