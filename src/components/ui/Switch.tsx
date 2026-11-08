import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label (clicking it toggles the switch). */
  label: ReactNode;
  /** Secondary text under the label, linked via aria-describedby. */
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  /** sm (32×20) · md (40×24, default) */
  size?: 'sm' | 'md';
  /** Keep the label for assistive technology but hide it visually (e.g. inside a table row). */
  labelHidden?: boolean;
  className?: string;
}

const TRACK = {
  sm: 'h-5 w-8',
  md: 'h-6 w-10',
} as const;

const THUMB = {
  sm: { size: 'size-3.5', on: 'translate-x-[14px]', off: 'translate-x-0.5' },
  md: { size: 'size-[18px]', on: 'translate-x-[18px]', off: 'translate-x-0.5' },
} as const;

/**
 * On/off toggle for settings that apply immediately (`role="switch"`).
 *
 * @example <Switch label="Rate active" checked={rate.active} onChange={(active) => update({ active })} />
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  size = 'md',
  labelHidden = false,
  className,
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? `${generatedId}switch`;
  const descriptionId = description ? `${switchId}-description` : undefined;
  const thumb = THUMB[size];

  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-60', className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors duration-150 ease-out motion-reduce:transition-none',
          TRACK[size],
          size === 'md' ? 'mt-0' : 'mt-0.5',
          checked ? 'bg-brand-600' : 'bg-slate-300',
          disabled ? 'cursor-not-allowed' : cn('cursor-pointer', checked ? 'hover:bg-brand-700' : 'hover:bg-slate-400/80'),
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-150 ease-out motion-reduce:transition-none',
            thumb.size,
            checked ? thumb.on : thumb.off,
          )}
        />
      </button>
      <div className={cn('min-w-0', labelHidden && 'sr-only')}>
        <label
          htmlFor={switchId}
          className={cn(
            'block text-sm font-medium leading-6 text-slate-900',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-sm leading-5 text-slate-600">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
