import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { isAriaInvalid } from './internal/aria';
import { edgeIndex, rovingTarget } from './internal/roving';

export interface OptionGroupOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Secondary line (cards layout; also shown under chip labels when set). */
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface OptionGroupProps<T extends string> {
  /** Form field name; a hidden input carries the value for native form submission. */
  name: string;
  /** Selected value, or '' for none. */
  value: T | '';
  onChange: (value: T) => void;
  options: Array<OptionGroupOption<T>>;
  /** chips (default): wrapped spec-picker buttons · cards: grid of selectable cards. */
  layout?: 'chips' | 'cards';
  /** Fixed column count. Chips wrap freely and cards auto-fill when omitted. */
  columns?: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md';
  invalid?: boolean;
  /** Accessible name when the group is not inside a <Field>. */
  ariaLabel?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  id?: string;
  required?: boolean;
  /** Disables every option. */
  disabled?: boolean;
  className?: string;
}

const CHIP_COLUMNS = {
  1: 'grid grid-cols-1',
  2: 'grid grid-cols-2',
  3: 'grid grid-cols-2 sm:grid-cols-3',
  4: 'grid grid-cols-2 sm:grid-cols-4',
} as const;

const CARD_COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
} as const;

/**
 * Single-choice picker (WAI-ARIA radio group): arrow keys move and select, Home/End jump, Tab
 * leaves the group. Works inside <Field> (accepts id, aria-describedby and aria-invalid).
 *
 * @example
 * <Field label="Material" required>
 *   <OptionGroup name="material" value={material} onChange={setMaterial} options={materials} />
 * </Field>
 */
export function OptionGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  layout = 'chips',
  columns,
  size = 'md',
  invalid,
  ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  id,
  required = false,
  disabled = false,
  className,
}: OptionGroupProps<T>) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isInvalid = invalid ?? isAriaInvalid(ariaInvalid);
  const isDisabled = (index: number) => disabled || Boolean(options[index]?.disabled);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStop =
    selectedIndex >= 0 && !isDisabled(selectedIndex) ? selectedIndex : edgeIndex(options.length, 'first', isDisabled);

  const select = (index: number) => {
    const option = options[index];
    if (!option || isDisabled(index)) return;
    if (option.value !== value) onChange(option.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = rovingTarget(event.key, options.length, index, isDisabled);
    if (target === null) return;
    event.preventDefault();
    if (target < 0) return;
    optionRefs.current[target]?.focus();
    select(target);
  };

  const isCards = layout === 'cards';
  const containerClass = isCards
    ? cn('grid gap-3', columns ? CARD_COLUMNS[columns] : 'grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))]')
    : cn('gap-2', columns ? CHIP_COLUMNS[columns] : 'flex flex-wrap');

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-invalid={isInvalid || undefined}
      aria-required={required || undefined}
      aria-disabled={disabled || undefined}
      className={cn(containerClass, className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const optionDisabled = isDisabled(index);
        return (
          <button
            key={option.value}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={optionDisabled}
            onClick={() => select(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'group relative border text-left transition-[background-color,border-color,color,box-shadow] duration-150 ease-out motion-reduce:transition-none',
              checked
                ? 'border-brand-600 shadow-[inset_0_0_0_1px_theme(colors.brand.600)]'
                : isInvalid
                  ? 'border-danger-400'
                  : 'border-line-strong',
              optionDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              !checked && !optionDisabled && 'hover:border-slate-400',
              isCards
                ? cn(
                    'flex w-full items-start gap-3 rounded-xl',
                    size === 'sm' ? 'p-3' : 'p-4',
                    checked ? 'bg-brand-50/60' : cn('bg-white', !optionDisabled && 'hover:bg-slate-50/70'),
                  )
                : cn(
                    'inline-flex items-center justify-center gap-2 rounded-lg text-center font-medium',
                    size === 'sm' ? 'tap-target min-h-8 px-3 py-1 text-[13px] leading-5' : 'min-h-10 px-3.5 py-2 text-sm leading-5',
                    checked ? 'bg-brand-50 text-brand-800' : 'bg-white text-slate-700',
                    !checked && !optionDisabled && 'hover:text-slate-900',
                  ),
            )}
          >
            {isCards ? (
              <CardContent option={option} checked={checked} size={size} />
            ) : (
              <ChipContent option={option} checked={checked} />
            )}
          </button>
        );
      })}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function ChipContent<T extends string>({ option, checked }: { option: OptionGroupOption<T>; checked: boolean }) {
  return (
    <>
      {option.icon && (
        <span
          aria-hidden="true"
          className={cn('inline-flex shrink-0 [&>svg]:size-4', checked ? 'text-brand-600' : 'text-slate-500')}
        >
          {option.icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block">{option.label}</span>
        {option.description && (
          <span className={cn('block text-xs font-normal', checked ? 'text-brand-700' : 'text-slate-500')}>
            {option.description}
          </span>
        )}
      </span>
      {checked && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 size-3.5 rounded-br-[6px] bg-brand-600 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
        >
          <Check className="absolute bottom-px right-px size-2 text-white [stroke-width:4]" />
        </span>
      )}
    </>
  );
}

function CardContent<T extends string>({
  option,
  checked,
  size,
}: {
  option: OptionGroupOption<T>;
  checked: boolean;
  size: 'sm' | 'md';
}) {
  return (
    <>
      {option.icon && (
        <span
          aria-hidden="true"
          className={cn(
            'grid shrink-0 place-items-center rounded-lg ring-1 ring-inset transition-colors duration-150',
            size === 'sm' ? 'size-8 [&>svg]:size-4' : 'size-9 [&>svg]:size-[18px]',
            checked ? 'bg-white text-brand-700 ring-brand-600/25' : 'bg-slate-50 text-slate-600 ring-line',
          )}
        >
          {option.icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5 text-slate-900">{option.label}</span>
        {option.description && (
          <span className="mt-0.5 block text-[13px] leading-5 text-slate-600">{option.description}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'mt-px grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors duration-150',
          checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-400 bg-white text-transparent',
        )}
      >
        <Check className="size-3 [stroke-width:3]" />
      </span>
    </>
  );
}
