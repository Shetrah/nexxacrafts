import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { tabClasses, tabCountClasses, tabIconClasses, tabListClasses } from './internal/tabStyles';

export interface NavTabItem {
  to: string;
  label: ReactNode;
  /** Only active on an exact match (use for index routes). */
  end?: boolean;
  count?: number;
  icon?: ReactNode;
}

export interface NavTabsProps {
  items: NavTabItem[];
  /** Accessible name of the navigation landmark. */
  ariaLabel: string;
  className?: string;
}

/**
 * Router-linked tabs (section navigation): looks like <Tabs variant="underline">, behaves like
 * links (`aria-current="page"` on the active route).
 *
 * @example <NavTabs ariaLabel="Account" items={[{ to: '/account', label: 'Overview', end: true }, { to: '/account/orders', label: 'Orders' }]} />
 */
export function NavTabs({ items, ariaLabel, className }: NavTabsProps) {
  return (
    <nav aria-label={ariaLabel} className={cn('min-w-0 border-b border-line', className)}>
      <ul className={tabListClasses('underline')}>
        {items.map((item) => (
          <li key={item.to} className="flex shrink-0">
            <NavLink to={item.to} end={item.end} className={({ isActive }) => tabClasses('underline', isActive)}>
              {({ isActive }) => (
                <>
                  {item.icon && (
                    <span aria-hidden="true" className={tabIconClasses(isActive)}>
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                  {typeof item.count === 'number' && (
                    <span className={tabCountClasses('underline', isActive)}>{item.count}</span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
