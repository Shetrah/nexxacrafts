import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Portal } from './internal/Portal';
import { useEscapeKey, useOverlayLayer } from './internal/layers';
import { getElementRef, mergeRefs } from './internal/mergeRefs';
import { computePosition, type FloatingPosition } from './internal/position';

export interface DropdownItem {
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  /** In-app link (react-router). */
  to?: string;
  /** Plain link. */
  href?: string;
  /** Link target for `href` items; "_blank" adds rel="noopener noreferrer". */
  target?: string;
  /** Destructive action (red). */
  danger?: boolean;
  disabled?: boolean;
  /** Secondary line under the label. */
  description?: ReactNode;
}

export type DropdownMenuEntry = DropdownItem | 'separator';

export interface DropdownMenuProps {
  /**
   * The button that opens the menu. It is cloned with aria-haspopup / aria-expanded /
   * aria-controls / onClick and must forward its ref to a DOM element (native elements, Button and
   * IconButton do).
   */
  trigger: ReactElement;
  items: DropdownMenuEntry[];
  /** Horizontal alignment to the trigger (default start). */
  align?: 'start' | 'end';
  /** Preferred side (flips automatically when there is no room). Default bottom. */
  side?: 'bottom' | 'top';
  /** Accessible name of the menu (defaults to the trigger's name). */
  label?: string;
  /** Fixed menu width in px (default: at least 12rem and the trigger width). */
  width?: number;
}

interface TriggerProps {
  id?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

type InitialFocus = 'first' | 'last' | 'menu';

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

function enabledItems(menu: HTMLElement | null) {
  return Array.from(menu?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
}

/**
 * Action menu (WAI-ARIA menu button): Enter/Space/Arrow keys open it, arrows move, Home/End jump,
 * typing a letter jumps to a matching item, Escape/Tab close, focus returns to the trigger.
 * Rendered in a portal and kept inside the viewport.
 *
 * @example
 * <DropdownMenu
 *   align="end"
 *   trigger={<IconButton label="More actions" icon={<MoreHorizontal />} />}
 *   items={[{ label: 'Edit', icon: <Pencil />, onSelect: edit }, 'separator', { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: remove }]}
 * />
 */
export function DropdownMenu({ trigger, items, align = 'start', side = 'bottom', label, width }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const [layerClass, setLayerClass] = useState('z-50');
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<InitialFocus>('first');
  const typeahead = useRef({ query: '', timer: 0 });
  const generatedId = useId();
  const menuId = `${generatedId}menu`;
  const triggerProps = trigger.props as TriggerProps;
  const triggerId = triggerProps.id ?? `${generatedId}menu-trigger`;
  const isTop = useOverlayLayer(open, 'popover');
  const triggerElementRef = getElementRef<HTMLElement>(trigger);
  const setTriggerRef = useMemo(() => mergeRefs(triggerRef, triggerElementRef), [triggerElementRef]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openMenu = (focus: InitialFocus) => {
    initialFocus.current = focus;
    // Menus opened from inside a dialog or drawer must stack above it.
    setLayerClass(triggerRef.current?.closest('[data-overlay-root]') ? 'z-65' : 'z-50');
    setTriggerWidth(triggerRef.current?.offsetWidth);
    setOpen(true);
  };

  useEscapeKey(open, isTop, () => close(true));

  // Position next to the trigger (before paint), keep it there on scroll/resize, then move focus in.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const triggerElement = triggerRef.current;
      const menu = menuRef.current;
      if (!triggerElement || !menu) return;
      const next = computePosition(
        triggerElement.getBoundingClientRect(),
        { width: menu.offsetWidth, height: menu.offsetHeight },
        side,
        align,
      );
      setPosition((previous) =>
        previous && previous.top === next.top && previous.left === next.left && previous.side === next.side
          ? previous
          : next,
      );
    };
    update();

    const focusTargets = enabledItems(menuRef.current);
    if (initialFocus.current === 'menu' || focusTargets.length === 0) {
      menuRef.current?.focus({ preventScroll: true });
    } else {
      const target = initialFocus.current === 'last' ? focusTargets[focusTargets.length - 1] : focusTargets[0];
      target.focus({ preventScroll: true });
    }

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, side, align]);

  // Clicking anywhere else closes the menu (without stealing focus from what was clicked).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, close]);

  useEffect(() => {
    const state = typeahead.current;
    return () => window.clearTimeout(state.timer);
  }, []);

  const handleTriggerClick = (event: MouseEvent<HTMLElement>) => {
    triggerProps.onClick?.(event);
    if (event.defaultPrevented) return;
    if (open) {
      close(false);
      return;
    }
    // Keyboard activation (detail 0) highlights the first item; pointer opens without a highlight.
    openMenu(event.detail === 0 ? 'first' : 'menu');
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    triggerProps.onKeyDown?.(event);
    if (event.defaultPrevented || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    openMenu(event.key === 'ArrowUp' ? 'last' : 'first');
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = enabledItems(menuRef.current);
    if (list.length === 0) return;
    const index = list.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        list[index < 0 ? 0 : (index + 1) % list.length].focus();
        return;
      case 'ArrowUp':
        event.preventDefault();
        list[index <= 0 ? list.length - 1 : index - 1].focus();
        return;
      case 'Home':
        event.preventDefault();
        list[0].focus();
        return;
      case 'End':
        event.preventDefault();
        list[list.length - 1].focus();
        return;
      case 'Tab':
        event.preventDefault();
        close(true);
        return;
      case ' ':
        // Links do not activate on Space natively.
        if (event.target instanceof HTMLAnchorElement) {
          event.preventDefault();
          event.target.click();
        }
        return;
      default:
        break;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const state = typeahead.current;
      window.clearTimeout(state.timer);
      state.query += event.key.toLowerCase();
      state.timer = window.setTimeout(() => {
        state.query = '';
      }, 500);
      const start = index < 0 ? 0 : index + (state.query.length === 1 ? 1 : 0);
      for (let offset = 0; offset < list.length; offset += 1) {
        const candidate = list[(start + offset) % list.length];
        if ((candidate.textContent ?? '').trim().toLowerCase().startsWith(state.query)) {
          candidate.focus();
          break;
        }
      }
    }
  };

  const focusOnHover = (event: MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    if (element.getAttribute('aria-disabled') === 'true') {
      if (document.activeElement !== menuRef.current) menuRef.current?.focus({ preventScroll: true });
      return;
    }
    if (document.activeElement !== element) element.focus({ preventScroll: true });
  };

  const renderItem = (item: DropdownItem, key: string) => {
    const className = cn(
      'group flex w-full select-none items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm leading-5 outline-none transition-colors duration-100 sm:py-2',
      item.disabled
        ? 'cursor-not-allowed opacity-50'
        : cn('cursor-pointer', item.danger ? 'text-danger-700 focus:bg-danger-50' : 'text-slate-700 focus:bg-slate-100 focus:text-slate-900'),
      item.disabled && (item.danger ? 'text-danger-700' : 'text-slate-700'),
    );
    const content = (
      <>
        {item.icon && (
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 inline-flex shrink-0 [&>svg]:size-4',
              item.danger ? 'text-danger-600' : 'text-slate-500 group-focus:text-slate-700',
            )}
          >
            {item.icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className={cn('block', Boolean(item.description) && 'font-medium')}>{item.label}</span>
          {item.description && (
            <span className={cn('mt-0.5 block text-xs', item.danger ? 'text-danger-600/80' : 'text-slate-500')}>
              {item.description}
            </span>
          )}
        </span>
      </>
    );
    const shared = {
      role: 'menuitem',
      tabIndex: -1,
      onMouseMove: focusOnHover,
      className,
    } as const;

    if (item.to && !item.disabled) {
      return (
        <Link
          key={key}
          to={item.to}
          {...shared}
          onClick={() => {
            close(false);
            item.onSelect?.();
          }}
        >
          {content}
        </Link>
      );
    }
    if (item.href && !item.disabled) {
      return (
        <a
          key={key}
          href={item.href}
          target={item.target}
          rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
          {...shared}
          onClick={() => {
            close(false);
            item.onSelect?.();
          }}
        >
          {content}
        </a>
      );
    }
    return (
      <button
        key={key}
        type="button"
        aria-disabled={item.disabled || undefined}
        {...shared}
        onClick={() => {
          if (item.disabled) return;
          // Focus returns to the trigger first, so a dialog opened by onSelect restores focus there.
          close(true);
          item.onSelect?.();
        }}
      >
        {content}
      </button>
    );
  };

  const triggerElement = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    ref: setTriggerRef,
    id: triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: handleTriggerClick,
    onKeyDown: handleTriggerKeyDown,
  });

  const placementOrigin =
    (position?.side ?? side) === 'top'
      ? align === 'end'
        ? 'origin-bottom-right'
        : 'origin-bottom-left'
      : align === 'end'
        ? 'origin-top-right'
        : 'origin-top-left';

  const sizing: CSSProperties = width ? { width } : { minWidth: triggerWidth };
  const style: CSSProperties = position
    ? { top: position.top, left: position.left, ...sizing }
    : { top: 0, left: 0, opacity: 0, ...sizing };

  return (
    <>
      {triggerElement}
      {open && (
        <Portal>
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            aria-labelledby={label ? undefined : triggerId}
            aria-orientation="vertical"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            style={style}
            className={cn(
              'surface-light fixed max-h-[min(24rem,calc(100vh-2rem))] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-line bg-white p-1 text-slate-700 shadow-md outline-none',
              'animate-scale-in motion-reduce:animate-none',
              !width && 'min-w-[12rem]',
              placementOrigin,
              layerClass,
            )}
          >
            {items.map((entry, index) =>
              entry === 'separator' ? (
                <div key={`separator-${index}`} role="separator" className="-mx-1 my-1 h-px bg-line" />
              ) : (
                renderItem(entry, `item-${index}`)
              ),
            )}
          </div>
        </Portal>
      )}
    </>
  );
}
