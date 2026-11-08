import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { edgeIndex, rovingTarget } from './internal/roving';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** sm 32px · md 36px (default) */
  size?: 'sm' | 'md';
  /** Accessible name of the group. */
  ariaLabel: string;
  /** Stretch segments to fill the container. */
  fullWidth?: boolean;
  className?: string;
}

/**
 * Compact single-choice switcher for views and filters (radio group semantics: arrow keys move
 * and select).
 *
 * @example <SegmentedControl ariaLabel="Period" options={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} value={period} onChange={setPeriod} />
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel,
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const isDisabled = (index: number) => Boolean(options[index]?.disabled);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStop =
    selectedIndex >= 0 && !isDisabled(selectedIndex) ? selectedIndex : edgeIndex(options.length, 'first', isDisabled);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = rovingTarget(event.key, options.length, index, isDisabled);
    if (target === null) return;
    event.preventDefault();
    if (target < 0) return;
    refs.current[target]?.focus();
    if (options[target].value !== value) onChange(options[target].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5 ring-1 ring-inset ring-line scrollbar-none',
        fullWidth ? 'flex w-full' : 'inline-flex',
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const disabled = isDisabled(index);
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => {
              if (!checked) onChange(option.value);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:[outline-offset:-2px] motion-reduce:transition-none [&_svg]:size-4',
              size === 'sm' ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-sm',
              fullWidth && 'flex-1',
              checked
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                : cn('text-slate-600', !disabled && 'hover:text-slate-900'),
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            )}
          >
            {option.icon && (
              <span aria-hidden="true" className={cn('inline-flex', checked ? 'text-brand-600' : 'text-slate-500')}>
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
