import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ControlSize } from './types';
import { isAriaInvalid } from './internal/aria';
import { controlFrameClasses, controlText } from './internal/controlStyles';

export interface NumberFieldProps {
  /** Current value; '' means empty. */
  value: number | '';
  /** Receives a finite number or '' — never NaN. */
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  /** Increment used by the −/+ buttons and arrow keys (default 1). */
  step?: number;
  /** Unit shown next to the number, e.g. "m²", "pcs", "cm". */
  unit?: string;
  invalid?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: ControlSize;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  /** Accessible names for the stepper buttons. */
  decrementLabel?: string;
  incrementLabel?: string;
  onBlur?: () => void;
  className?: string;
}

const BUTTON_WIDTH: Record<ControlSize, string> = {
  sm: 'w-8 [&>svg]:size-3.5',
  md: 'w-10 [&>svg]:size-4',
  lg: 'w-12 [&>svg]:size-[18px]',
};

const NUMERIC_PATTERN = /^-?\d*[.,]?\d*$/;

/** '' for empty, a finite number, or null when the text is not (yet) a number ("-", "."). */
function parseNumber(text: string): number | '' | null {
  const normalised = text.trim().replace(',', '.');
  if (normalised === '') return '';
  if (normalised === '-' || normalised === '.' || normalised === '-.') return null;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalsOf(value: number) {
  const text = String(value);
  const index = text.indexOf('.');
  return index === -1 ? 0 : text.length - index - 1;
}

/**
 * Numeric input with −/+ steppers and an optional unit (`role="spinbutton"`). Typing is free-form
 * (decimal comma accepted); the value is clamped to min/max on blur. Arrow Up/Down step,
 * Page Up/Down step ×10, Home/End jump to min/max.
 *
 * @example <NumberField value={width} onChange={setWidth} min={0.1} step={0.1} unit="m" />
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  invalid,
  id,
  name,
  disabled = false,
  required,
  placeholder,
  size = 'md',
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  decrementLabel = 'Decrease',
  incrementLabel = 'Increase',
  onBlur,
  className,
}: NumberFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}number`;
  const inputRef = useRef<HTMLInputElement>(null);
  // While the user types we show their raw text; otherwise the formatted value.
  const [draft, setDraft] = useState<string | null>(null);
  const isInvalid = invalid ?? isAriaInvalid(ariaInvalid);
  const text = draft ?? (value === '' ? '' : String(value));

  const clamp = (input: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, input));
  const allowNegative = min === undefined || min < 0;
  const atMin = typeof value === 'number' && min !== undefined && value <= min;
  const atMax = typeof value === 'number' && max !== undefined && value >= max;

  const commit = (next: number | '') => {
    setDraft(null);
    if (next !== value) onChange(next);
  };

  const stepBy = (direction: 1 | -1, multiplier = 1) => {
    if (disabled) return;
    if (typeof value !== 'number') {
      commit(clamp(min ?? 0));
      return;
    }
    const precision = Math.max(decimalsOf(step), decimalsOf(value));
    const next = Number((value + direction * step * multiplier).toFixed(precision));
    commit(clamp(next));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!NUMERIC_PATTERN.test(raw) || (!allowNegative && raw.includes('-'))) return;
    setDraft(raw);
    const parsed = parseNumber(raw);
    if (parsed !== null && parsed !== value) onChange(parsed);
  };

  const handleBlur = () => {
    const parsed = draft !== null ? parseNumber(draft) : value;
    if (parsed === null) {
      setDraft(null);
    } else {
      commit(parsed === '' ? '' : clamp(parsed));
    }
    onBlur?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        stepBy(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        stepBy(-1);
        break;
      case 'PageUp':
        event.preventDefault();
        stepBy(1, 10);
        break;
      case 'PageDown':
        event.preventDefault();
        stepBy(-1, 10);
        break;
      case 'Home':
        if (min !== undefined) {
          event.preventDefault();
          commit(min);
        }
        break;
      case 'End':
        if (max !== undefined) {
          event.preventDefault();
          commit(max);
        }
        break;
      default:
        break;
    }
  };

  // Clicking empty space in the middle section focuses the input.
  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  // Steppers do not steal focus from the input, so typing can continue after a click.
  const keepInputFocus = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();

  const stepperClass = cn(
    'flex h-full shrink-0 items-center justify-center text-slate-600 transition-colors duration-150 ease-out motion-reduce:transition-none',
    'enabled:hover:bg-slate-50 enabled:hover:text-slate-900 enabled:active:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300',
    BUTTON_WIDTH[size],
  );

  const widthInCh = Math.max(text.length, placeholder?.length ?? 0, 1) + 0.75;

  return (
    <div className={cn(controlFrameClasses({ size, invalid: isInvalid, disabled }), 'overflow-hidden', className)}>
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={keepInputFocus}
        aria-label={decrementLabel}
        aria-controls={inputId}
        disabled={disabled || atMin}
        onClick={() => stepBy(-1)}
        className={cn(stepperClass, 'border-r border-line')}
      >
        <Minus aria-hidden="true" />
      </button>
      <div
        className={cn('flex h-full min-w-0 flex-1 items-center justify-center gap-1 px-2', !disabled && 'cursor-text')}
        onMouseDown={focusInput}
      >
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          role="spinbutton"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={isInvalid || undefined}
          aria-valuenow={typeof value === 'number' ? value : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={typeof value === 'number' && unit ? `${value} ${unit}` : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={unit ? { width: `${widthInCh}ch` } : undefined}
          className={cn(
            'h-full min-w-0 bg-transparent text-center tabular-nums text-slate-900 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500',
            unit ? 'max-w-full' : 'w-full',
            controlText[size],
          )}
        />
        {unit && (
          <span aria-hidden="true" className="pointer-events-none shrink-0 select-none font-mono text-[13px] text-slate-500">
            {unit}
          </span>
        )}
      </div>
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={keepInputFocus}
        aria-label={incrementLabel}
        aria-controls={inputId}
        disabled={disabled || atMax}
        onClick={() => stepBy(1)}
        className={cn(stepperClass, 'border-l border-line')}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}
