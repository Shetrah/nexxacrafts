import { useCallback, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react';

/** Props spread onto one focusable hit target (a bar column, an x position, a segment). */
export interface ChartTargetProps {
  ref: (node: HTMLElement | null) => void;
  tabIndex: number;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
}

/** Pointer-only handlers for marks that are not focusable themselves (e.g. donut slices). */
export interface ChartHoverProps {
  onPointerEnter: (event: PointerEvent<Element>) => void;
  onPointerLeave: (event: PointerEvent<Element>) => void;
}

/** State and prop getters returned by {@link useChartInteraction}. */
export interface ChartInteraction {
  /** Index whose details are shown (hover wins over focus), or `null`. */
  activeIndex: number | null;
  /** Index that currently holds keyboard focus, or `null`. */
  focusIndex: number | null;
  /** Props for the focusable target at `index` (roving tabindex: one tab stop per chart). */
  getTargetProps: (index: number) => ChartTargetProps;
  /** Pointer-only props for a non-focusable mark at `index`. */
  getHoverProps: (index: number) => ChartHoverProps;
  /** Spread on the element that wraps all targets; clears hover when the pointer leaves it. */
  layerProps: { onPointerLeave: () => void };
}

/**
 * Hover + keyboard behaviour shared by every interactive chart.
 *
 * - Pointer: entering a target shows its details; leaving the layer hides them.
 * - Keyboard: the chart is one tab stop; Arrow keys / Home / End move between targets and the
 *   focused target shows the same details as hover. Escape dismisses until the next move.
 * - Touch: a tap focuses the target, so its details stay visible until focus moves elsewhere.
 *
 * @param count number of targets
 */
export function useChartInteraction(count: number): ChartInteraction {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const nodes = useRef<Array<HTMLElement | null>>([]);
  const lastPointer = useRef<string | null>(null);

  const last = Math.max(0, count - 1);
  const stop = Math.min(tabStop, last);
  const visibleHover = hoverIndex !== null && hoverIndex <= last ? hoverIndex : null;
  const visibleFocus = focusIndex !== null && focusIndex <= last ? focusIndex : null;
  const activeIndex = dismissed ? null : (visibleHover ?? visibleFocus);

  const moveFocus = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), last);
      setTabStop(next);
      nodes.current[next]?.focus();
    },
    [last],
  );

  const getTargetProps = useCallback(
    (index: number): ChartTargetProps => ({
      ref: (node) => {
        nodes.current[index] = node;
      },
      tabIndex: index === stop ? 0 : -1,
      onFocus: () => {
        setTabStop(index);
        setDismissed(false);
        // A mouse click focuses the target too; hover already shows it, so do not pin it.
        if (lastPointer.current !== 'mouse') setFocusIndex(index);
        lastPointer.current = null;
      },
      onBlur: (event) => {
        const next = event.relatedTarget;
        if (next instanceof HTMLElement && nodes.current.includes(next)) return;
        setFocusIndex(null);
      },
      onKeyDown: (event) => {
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            event.preventDefault();
            moveFocus(index + 1);
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            event.preventDefault();
            moveFocus(index - 1);
            break;
          case 'Home':
            event.preventDefault();
            moveFocus(0);
            break;
          case 'End':
            event.preventDefault();
            moveFocus(last);
            break;
          case 'Escape':
            setDismissed(true);
            break;
          default:
            break;
        }
      },
      onPointerDown: (event) => {
        lastPointer.current = event.pointerType;
      },
      onPointerEnter: () => {
        setHoverIndex(index);
        setDismissed(false);
      },
    }),
    [last, moveFocus, stop],
  );

  const getHoverProps = useCallback(
    (index: number): ChartHoverProps => ({
      onPointerEnter: () => {
        setHoverIndex(index);
        setDismissed(false);
      },
      onPointerLeave: () => setHoverIndex((current) => (current === index ? null : current)),
    }),
    [],
  );

  const layerProps = {
    onPointerLeave: () => setHoverIndex(null),
  };

  return { activeIndex, focusIndex: visibleFocus, getTargetProps, getHoverProps, layerProps };
}
