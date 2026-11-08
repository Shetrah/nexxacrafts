import {
  Children,
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { Portal } from './internal/Portal';
import { joinIds } from './internal/aria';
import { useEscapeKey, useOverlayLayer } from './internal/layers';
import { getElementRef, mergeRefs } from './internal/mergeRefs';
import { computePosition, type FloatingPosition } from './internal/position';

export interface TooltipProps {
  /** Short supplementary text. Never put essential information or interactive content here. */
  content: ReactNode;
  /**
   * A single focusable element that forwards its ref (native element, Button, IconButton).
   * Disabled buttons fire no pointer events — wrap them in a <span tabIndex={0}>.
   */
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Hover delay in ms (default 300). Keyboard focus shows it immediately. */
  delay?: number;
}

interface TriggerProps {
  title?: string;
  'aria-describedby'?: string;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
}

/**
 * Hover/focus hint (`role="tooltip"`, linked with aria-describedby). Escape hides it; the bubble
 * itself can be hovered. For icon-only buttons, IconButton's `label` already names the control —
 * use a Tooltip only for extra context.
 *
 * @example <Tooltip content="Prices include VAT"><IconButton label="Pricing info" icon={<Info />} /></Tooltip>
 */
export function Tooltip({ content, children, side = 'top', delay = 300 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const [layerClass, setLayerClass] = useState('z-50');
  const generatedId = useId();
  const tooltipId = `${generatedId}tooltip`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timers = useRef({ show: 0, hide: 0 });
  const isTop = useOverlayLayer(open, 'tooltip');

  const child = Children.only(children) as ReactElement<TriggerProps>;
  const childProps = child.props;
  const childRef = getElementRef<HTMLElement>(child);
  const setTriggerRef = useMemo(() => mergeRefs(triggerRef, childRef), [childRef]);

  useEscapeKey(open, isTop, () => setOpen(false));

  useEffect(() => {
    const current = timers.current;
    return () => {
      window.clearTimeout(current.show);
      window.clearTimeout(current.hide);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;
    setPosition(
      computePosition(
        trigger.getBoundingClientRect(),
        { width: tooltip.offsetWidth, height: tooltip.offsetHeight },
        side,
        'center',
        8,
      ),
    );
  }, [open, side, content]);

  const clearTimers = () => {
    window.clearTimeout(timers.current.show);
    window.clearTimeout(timers.current.hide);
  };

  const show = (immediate: boolean) => {
    clearTimers();
    const reveal = () => {
      setLayerClass(triggerRef.current?.closest('[data-overlay-root]') ? 'z-65' : 'z-50');
      setOpen(true);
    };
    if (immediate || delay <= 0) reveal();
    else timers.current.show = window.setTimeout(reveal, delay);
  };

  const hide = (immediate: boolean) => {
    clearTimers();
    if (immediate) setOpen(false);
    // A short grace period lets the pointer travel onto the bubble.
    else timers.current.hide = window.setTimeout(() => setOpen(false), 120);
  };

  const trigger = cloneElement(child, {
    ref: setTriggerRef,
    // An empty title removes the native browser tooltip, which would duplicate this one.
    title: '',
    'aria-describedby': joinIds(childProps['aria-describedby'], tooltipId),
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      childProps.onMouseEnter?.(event);
      show(false);
    },
    onMouseLeave: (event: MouseEvent<HTMLElement>) => {
      childProps.onMouseLeave?.(event);
      hide(false);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(event);
      // Keyboard focus only; a mouse click should not pop the hint up again.
      if (event.currentTarget.matches(':focus-visible')) show(true);
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      hide(true);
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      childProps.onPointerDown?.(event);
      hide(true);
    },
  } as TriggerProps & { ref: typeof setTriggerRef });

  const style: CSSProperties = position ? { top: position.top, left: position.left } : { top: 0, left: 0, opacity: 0 };

  return (
    <>
      {trigger}
      <Portal>
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          hidden={!open}
          style={style}
          onMouseEnter={clearTimers}
          onMouseLeave={() => hide(false)}
          className={cn(
            'fixed max-w-[16rem] rounded-md bg-ink-900 px-2.5 py-1.5 text-xs font-medium leading-4 text-white shadow-md',
            'animate-fade-in motion-reduce:animate-none',
            layerClass,
          )}
        >
          {content}
        </div>
      </Portal>
    </>
  );
}
