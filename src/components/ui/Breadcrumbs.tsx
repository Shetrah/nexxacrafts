import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export interface BreadcrumbItem {
  label: ReactNode;
  /** Link target; omit for the current page (the last item). */
  to?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Location trail. The last item is the current page (`aria-current="page"`).
 *
 * @example <Breadcrumbs items={[{ label: 'Orders', to: '/admin/orders' }, { label: 'NCO-261107-AB12C' }]} />
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-slate-500">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={index} className="inline-flex min-w-0 items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="select-none text-slate-300">
                  /
                </span>
              )}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-slate-900">
                  {item.label}
                </span>
              ) : item.to ? (
                <Link
                  to={item.to}
                  className="truncate rounded-sm transition-colors duration-150 hover:text-slate-900 hover:underline hover:underline-offset-4"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="truncate">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
