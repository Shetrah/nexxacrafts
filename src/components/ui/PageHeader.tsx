import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { Eyebrow } from './Eyebrow';

export interface PageHeaderProps {
  /** Page title (rendered as the page's h1). */
  title: ReactNode;
  description?: ReactNode;
  /** Short label above the title; strings render as an <Eyebrow>. */
  eyebrow?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** Primary/secondary actions, right-aligned on desktop. One primary action per view. */
  actions?: ReactNode;
  /** Meta row under the description (status badge, reference, dates). */
  meta?: ReactNode;
  /** default · compact (dense staff screens) */
  size?: 'default' | 'compact';
  className?: string;
}

/**
 * Top of a workspace or staff page: breadcrumbs → title + description → actions.
 *
 * @example <PageHeader breadcrumbs={[{ label: 'Orders', to: '/admin/orders' }, { label: order.reference }]} title={order.reference} actions={<Button>Update status</Button>} />
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  meta,
  size = 'default',
  className,
}: PageHeaderProps) {
  const compact = size === 'compact';
  return (
    <div className={cn('min-w-0', compact ? 'pb-5' : 'pb-6 sm:pb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-3" />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-2">{typeof eyebrow === 'string' ? <Eyebrow>{eyebrow}</Eyebrow> : eyebrow}</div>
          )}
          <h1
            className={cn(
              'break-words font-bold tracking-tight',
              compact ? 'text-xl leading-7' : 'text-2xl leading-8 sm:text-[1.75rem] sm:leading-9',
            )}
          >
            {title}
          </h1>
          {description && (
            <p className={cn('mt-1.5 max-w-3xl text-slate-600', compact ? 'text-sm leading-5' : 'text-sm leading-6 sm:text-base')}>
              {description}
            </p>
          )}
          {meta && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">{meta}</div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
