import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type KbdProps = HTMLAttributes<HTMLElement>;

/** Keyboard key hint, e.g. <Kbd>/</Kbd> or <Kbd>Esc</Kbd>. */
export function Kbd({ className, children, ...rest }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-line-strong bg-white px-1.5 font-mono text-[11px] font-medium leading-none text-slate-600 shadow-[inset_0_-1px_0_rgba(11,18,32,0.08)]',
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
