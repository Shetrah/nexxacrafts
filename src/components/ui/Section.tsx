import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionProps {
  /** white (default) · paper (warm off-white) · ink (dark) · brand (electric blue) */
  tone?: 'white' | 'paper' | 'ink' | 'brand';
  /** Vertical rhythm: sm · md (default, 64/96px) · lg */
  spacing?: 'sm' | 'md' | 'lg';
  id?: string;
  className?: string;
  children: ReactNode;
  /** Id of the section heading (SectionHeader `id`). */
  'aria-labelledby'?: string;
}

const TONES = {
  white: 'bg-white text-slate-700',
  paper: 'bg-paper text-slate-700',
  ink: 'surface-inverse bg-ink-900 text-slate-300',
  brand: 'surface-inverse bg-brand-600 text-brand-100',
} as const;

const SPACING = {
  sm: 'py-10 md:py-14',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
} as const;

/**
 * Full-bleed band of a marketing page. Dark tones (ink, brand) switch headings, links, focus rings
 * and the precision grid to their light-on-dark colours for every descendant.
 *
 * @example
 * <Section tone="paper" aria-labelledby="services-title">
 *   <Container><SectionHeader id="services-title" eyebrow="Services" index="01" title="…" /></Container>
 * </Section>
 */
export function Section({
  tone = 'white',
  spacing = 'md',
  id,
  className,
  children,
  'aria-labelledby': ariaLabelledBy,
}: SectionProps) {
  return (
    <section id={id} aria-labelledby={ariaLabelledBy} className={cn('relative', TONES[tone], SPACING[spacing], className)}>
      {children}
    </section>
  );
}
