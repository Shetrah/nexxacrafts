import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { rovingTarget } from './internal/roving';
import { tabDomId, tabPanelDomId } from './internal/tabIds';
import { tabClasses, tabCountClasses, tabIconClasses, tabListClasses, type TabVariant } from './internal/tabStyles';

export interface TabItem {
  id: string;
  label: ReactNode;
  /** Count bubble, e.g. number of orders in this view. */
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Id of the selected tab. */
  value: string;
  onChange: (id: string) => void;
  /** Accessible name of the tab list. */
  ariaLabel: string;
  /** underline (default) · pills */
  variant?: TabVariant;
  /**
   * Prefix for the tab/panel ids. Pass the same value to every <TabPanel>; set a unique prefix when
   * a page has more than one tab set. Default "tabs".
   */
  idPrefix?: string;
  className?: string;
}

/**
 * WAI-ARIA tabs (automatic activation): Left/Right move and select, Home/End jump. The list
 * scrolls horizontally on small screens.
 *
 * @example
 * <Tabs ariaLabel="Order sections" items={[{ id: 'details', label: 'Details' }, { id: 'files', label: 'Files', count: 3 }]} value={tab} onChange={setTab} />
 * <TabPanel id="details" activeId={tab}>…</TabPanel>
 */
export function Tabs({ items, value, onChange, ariaLabel, variant = 'underline', idPrefix = 'tabs', className }: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = items.findIndex((item) => item.id === value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = rovingTarget(event.key, items.length, index, () => false, 'horizontal');
    if (target === null || target < 0) return;
    event.preventDefault();
    tabRefs.current[target]?.focus();
    if (items[target].id !== value) onChange(items[target].id);
  };

  return (
    <div className={cn('min-w-0', variant === 'underline' && 'border-b border-line', className)}>
      <div role="tablist" aria-label={ariaLabel} aria-orientation="horizontal" className={tabListClasses(variant)}>
        {items.map((item, index) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={tabDomId(idPrefix, item.id)}
              aria-selected={selected}
              aria-controls={tabPanelDomId(idPrefix, item.id)}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => {
                if (!selected) onChange(item.id);
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={tabClasses(variant, selected)}
            >
              {item.icon && (
                <span aria-hidden="true" className={tabIconClasses(selected)}>
                  {item.icon}
                </span>
              )}
              {item.label}
              {typeof item.count === 'number' && <span className={tabCountClasses(variant, selected)}>{item.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface TabPanelProps {
  /** Id of the tab this panel belongs to. */
  id: string;
  /** Currently selected tab id (the Tabs `value`). */
  activeId: string;
  /** Must match the Tabs `idPrefix`. Default "tabs". */
  idPrefix?: string;
  /** Keep the content mounted (hidden) when inactive, preserving its state. */
  keepMounted?: boolean;
  className?: string;
  children: ReactNode;
}

/** Content for one tab; rendered only while active unless `keepMounted`. */
export function TabPanel({ id, activeId, idPrefix = 'tabs', keepMounted = false, className, children }: TabPanelProps) {
  const active = id === activeId;
  return (
    <div
      role="tabpanel"
      id={tabPanelDomId(idPrefix, id)}
      aria-labelledby={tabDomId(idPrefix, id)}
      hidden={!active}
      tabIndex={0}
      className={cn('rounded-md focus-visible:outline-offset-4', className)}
    >
      {active || keepMounted ? children : null}
    </div>
  );
}
