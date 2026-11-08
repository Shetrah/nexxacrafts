import {
  forwardRef,
  useMemo,
  useRef,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import type { ControlSize } from './types';
import { isAriaInvalid } from './internal/aria';
import { controlFrameClasses, controlIcon, controlText } from './internal/controlStyles';
import { mergeRefs } from './internal/mergeRefs';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** sm 32px · md 40px (default) · lg 48px */
  size?: ControlSize;
  /** Error styling. Also inferred from `aria-invalid` (set automatically inside <Field error>). */
  invalid?: boolean;
  /** Decorative icon inside the field, on the left. */
  leftIcon?: ReactNode;
  /** Content inside the field, on the right: a unit ("m²", "KES") or a small button. */
  rightAddon?: ReactNode;
  /** Classes for the native <input> (className styles the outer frame). */
  inputClassName?: string;
}

const PAD_LEFT: Record<ControlSize, string> = { sm: 'pl-2.5', md: 'pl-3', lg: 'pl-4' };
const PAD_RIGHT: Record<ControlSize, string> = { sm: 'pr-2.5', md: 'pr-3', lg: 'pr-4' };

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"]';

/**
 * Text input. The frame owns the border and focus ring, so icons and addons sit inside it.
 *
 * @example <Input type="email" placeholder="you@company.co.ke" leftIcon={<Mail />} />
 * @example <Input inputMode="decimal" rightAddon="m²" />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = 'md',
    invalid,
    leftIcon,
    rightAddon,
    className,
    inputClassName,
    disabled = false,
    type = 'text',
    'aria-invalid': ariaInvalid,
    ...rest
  },
  ref,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  const setRefs = useMemo(() => mergeRefs(innerRef, ref), [ref]);
  const isInvalid = invalid ?? isAriaInvalid(ariaInvalid);
  const textAddon = typeof rightAddon === 'string' || typeof rightAddon === 'number';

  // Clicking the frame, icon or a text addon focuses the input (but not buttons inside the addon).
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (disabled || target === innerRef.current || target.closest(INTERACTIVE)) return;
    event.preventDefault();
    innerRef.current?.focus();
  };

  return (
    <div
      className={cn(controlFrameClasses({ size, invalid: isInvalid, disabled }), !disabled && 'cursor-text', className)}
      onMouseDown={handleMouseDown}
    >
      {leftIcon && (
        <span
          aria-hidden="true"
          className={cn('pointer-events-none flex shrink-0 text-slate-500', controlIcon[size], PAD_LEFT[size])}
        >
          {leftIcon}
        </span>
      )}
      <input
        {...rest}
        ref={setRefs}
        type={type}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        className={cn(
          'h-full w-full min-w-0 flex-1 rounded-[inherit] bg-transparent text-slate-900 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500',
          '[&::-webkit-search-cancel-button]:appearance-none',
          controlText[size],
          leftIcon ? 'pl-2' : PAD_LEFT[size],
          rightAddon ? 'pr-2' : PAD_RIGHT[size],
          inputClassName,
        )}
      />
      {rightAddon !== undefined && rightAddon !== null && rightAddon !== false && (
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 text-slate-500',
            textAddon && 'pointer-events-none select-none font-mono text-[13px]',
            PAD_RIGHT[size],
          )}
        >
          {rightAddon}
        </span>
      )}
    </div>
  );
});
