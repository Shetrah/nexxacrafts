import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Eyebrow } from './Eyebrow';

export interface SectionHeaderProps {
  /** Mono label above the title (rendered with <Eyebrow>). */
  eyebrow?: ReactNode;
  /** Index for the eyebrow, e.g. "02" → "02 — PROCESS". */
  index?: string;
  title: ReactNode;
  description?: ReactNode;
  /** A link or button aligned with the title (right on desktop, below on phones). */
  action?: ReactNode;
  /** left (default) · center */
  align?: 'left' | 'center';
  /** Heading level (default h2; h1 uses the page-title scale). */
  titleAs?: 'h1' | 'h2' | 'h3';
  /** Id for the heading (pair with Section aria-labelledby). */
  id?: string;
  /** light (default) · dark (on ink/brand sections) */
  tone?: 'light' | 'dark';
  className?: string;
}

const TITLE_CLASS = {
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
} as const;

/**
 * Section intro: eyebrow → title → lead, with an optional action.
 *
 * @example <SectionHeader index="01" eyebrow="Services" title="Everything from screen to street" description="…" action={<ButtonLink to="/services" variant="secondary">All services</ButtonLink>} />
 */
export function SectionHeader({
  eyebrow,
  index,
  title,
  description,
  action,
  align = 'left',
  titleAs: Title = 'h2',
  id,
  tone = 'light',
  className,
}: SectionHeaderProps) {
  const centered = align === 'center';
  const dark = tone === 'dark';
  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        dark && 'surface-inverse',
        centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between md:gap-10',
        className,
      )}
    >
      <div className={cn('min-w-0 max-w-2xl', centered && 'mx-auto')}>
        {eyebrow && (
          <Eyebrow index={index} tone={dark ? 'inverse' : 'brand'} className="mb-4">
            {eyebrow}
          </Eyebrow>
        )}
        <Title id={id} className={TITLE_CLASS[Title]}>
          {title}
        </Title>
        {description && (
          <p className={cn('text-lead mt-4', centered && 'mx-auto', dark && 'text-slate-300')}>{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div>}
    </div>
  );
}
