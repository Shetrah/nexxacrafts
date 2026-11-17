import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type Key, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DynamicButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Short label that can transition when `stateKey` changes. */
  children: string;
  icon?: ReactNode;
  stateKey?: Key;
  variant?: 'primary' | 'secondary';
  width?: 'content' | 'full';
}

/** Button with a compact label/icon transition for state changes (copy, save, send, etc.). */
export const DynamicButton = forwardRef<HTMLButtonElement, DynamicButtonProps>(function DynamicButton(
  { children, className, icon, stateKey, type = 'button', variant = 'primary', width = 'content', ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={cn(
        'dynamic-button relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-lg border px-3 text-sm font-semibold',
        variant === 'primary'
          ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'
          : 'border-line-strong bg-white text-slate-900 hover:bg-slate-50',
        width === 'full' ? 'w-full' : 'w-fit',
        className,
      )}
    >
      {icon && <span key={`icon-${String(stateKey ?? children)}`} className="dynamic-button-icon" aria-hidden="true">{icon}</span>}
      <span key={`label-${String(stateKey ?? children)}`} className="dynamic-button-label" aria-live="polite">{children}</span>
    </button>
  );
});

/** Copy action with an accessible, brief success state. */
export function CopyDynamicButton({ value, children = 'Copy', className }: { value: string; children?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access may be unavailable outside HTTPS or a user initiated context.
      setCopied(false);
    }
  }

  return (
    <DynamicButton
      aria-label={copied ? 'Copied to clipboard' : children}
      className={className}
      icon={copied ? <Check className="text-emerald-300" size={15} strokeWidth={2.6} /> : <Copy size={15} strokeWidth={2.3} />}
      onClick={copyValue}
      stateKey={copied ? 'copied' : 'copy'}
      type="button"
    >
      {copied ? 'Copied' : children}
    </DynamicButton>
  );
}
