import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EyebrowProps {
  /** Section index, e.g. "01" → "01 — SERVICES". */
  index?: string;
  /** brand (default) · muted · inverse (on dark surfaces) */
  tone?: 'brand' | 'muted' | 'inverse';
  className?: string;
  children: ReactNode;
}

const TONES = {
  brand: { text: 'text-brand-700', index: 'text-slate-500' },
  muted: { text: 'text-slate-600', index: 'text-slate-500' },
  inverse: { text: 'text-brand-200', index: 'text-white/60' },
} as const;

/**
 * Spec-sheet section label: mono, uppercase, with a short signal-red tick.
 *
 * @example <Eyebrow index="01">Services</Eyebrow>
 */
export function Eyebrow({ index, tone = 'brand', className, children }: EyebrowProps) {
  const styles = TONES[tone];
  return (
    <p className={cn('eyebrow', styles.text, className)}>
      <span aria-hidden="true" className="h-3 w-0.5 shrink-0 rounded-full bg-accent-600" />
      <span>
        {index && (
          <>
            <span className={styles.index}>{index}</span>
            <span aria-hidden="true" className={cn('mx-2', styles.index)}>
              —
            </span>
          </>
        )}
        {children}
      </span>
    </p>
  );
}
