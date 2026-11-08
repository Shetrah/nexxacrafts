import { cn } from '@/lib/cn';
import type { ControlSize } from '../types';

/** Height + radius per control size (sm 32px · md 40px · lg 48px). */
export const controlHeight: Record<ControlSize, string> = {
  sm: 'h-8 rounded-md',
  md: 'h-10 rounded-lg',
  lg: 'h-12 rounded-lg',
};

/** 16px on phones (prevents iOS zoom on focus), compact from `sm` up. */
export const controlText: Record<ControlSize, string> = {
  sm: 'text-base sm:text-[13px]',
  md: 'text-base sm:text-sm',
  lg: 'text-base',
};

export const controlPaddingX: Record<ControlSize, string> = {
  sm: 'px-2.5',
  md: 'px-3',
  lg: 'px-4',
};

/** Icon size inside controls. */
export const controlIcon: Record<ControlSize, string> = {
  sm: '[&>svg]:size-4',
  md: '[&>svg]:size-4',
  lg: '[&>svg]:size-[18px]',
};

interface FrameOptions {
  size?: ControlSize;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * Bordered frame for composite controls (input with icon/addon, number stepper, search). The
 * focus ring is drawn with `focus-within`, so the native element inside stays outline-free.
 */
export function controlFrameClasses({ size = 'md', invalid = false, disabled = false }: FrameOptions) {
  return cn(
    'flex w-full items-center border transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none',
    controlHeight[size],
    invalid
      ? 'border-danger-500 focus-within:border-danger-500 focus-within:ring-4 focus-within:ring-danger-600/15'
      : 'border-line-strong focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-600/15',
    disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : 'bg-white text-slate-900 shadow-xs',
  );
}

/**
 * Border/ring for single native controls (textarea, select) that take focus themselves.
 * Text colour is left to the caller (Select dims its placeholder state).
 */
export function controlSurfaceClasses(invalid: boolean) {
  return cn(
    'border bg-white shadow-xs transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-slate-500 focus:outline-none focus:ring-4 motion-reduce:transition-none',
    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:shadow-none',
    invalid
      ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-600/15'
      : 'border-line-strong focus:border-brand-500 focus:ring-brand-600/15',
  );
}
