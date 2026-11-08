import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { getTabbable } from './focusable';

/**
 * A tiny stack of open overlays so nested layers behave: Escape closes only the top-most layer
 * and a modal's focus trap pauses while a menu opened from inside it is active.
 *
 * - `modal`: dialogs and drawers (trap focus).
 * - `popover`: menus (own their keyboard handling while open).
 * - `tooltip`: only takes part in Escape handling.
 */
export type LayerKind = 'modal' | 'popover' | 'tooltip';

interface LayerEntry {
  id: number;
  kind: LayerKind;
}

const stack: LayerEntry[] = [];
let nextLayerId = 1;

function topEntry(kinds?: LayerKind[]): LayerEntry | undefined {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index];
    if (!kinds || kinds.includes(entry.kind)) return entry;
  }
  return undefined;
}

/**
 * Registers a layer while `active`. Returns `isTop(kinds?)`: whether this layer is the top-most
 * among the given kinds (all kinds by default).
 */
export function useOverlayLayer(active: boolean, kind: LayerKind) {
  const idRef = useRef(0);

  useEffect(() => {
    if (!active) return undefined;
    const entry: LayerEntry = { id: nextLayerId, kind };
    nextLayerId += 1;
    idRef.current = entry.id;
    stack.push(entry);
    return () => {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
      idRef.current = 0;
    };
  }, [active, kind]);

  return useCallback((kinds?: LayerKind[]) => {
    const id = idRef.current;
    return id !== 0 && topEntry(kinds)?.id === id;
  }, []);
}

/** Calls `onEscape` when Escape is pressed while this layer is on top. */
export function useEscapeKey(active: boolean, isTop: () => boolean, onEscape: () => void) {
  const handlerRef = useRef(onEscape);

  useEffect(() => {
    handlerRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return;
      if (!isTop()) return;
      event.preventDefault();
      handlerRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, isTop]);
}

let scrollLocks = 0;
let savedBodyStyle: { overflow: string; paddingRight: string } | null = null;

/** Locks page scrolling while active (reference counted; compensates for the scrollbar width). */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    const { body, documentElement } = document;
    if (scrollLocks === 0) {
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
      savedBodyStyle = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0 && savedBodyStyle) {
        body.style.overflow = savedBodyStyle.overflow;
        body.style.paddingRight = savedBodyStyle.paddingRight;
        savedBodyStyle = null;
      }
    };
  }, [active]);
}

let inertLocks = 0;

/**
 * Makes the application root (#root) inert while a modal layer is open, so background content is
 * unreachable by keyboard, pointer and assistive technology. Overlays render in portals on
 * document.body and are unaffected.
 */
export function useInertAppRoot(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    const root = document.getElementById('root');
    if (!root) return undefined;
    inertLocks += 1;
    root.inert = true;
    return () => {
      inertLocks -= 1;
      if (inertLocks === 0) root.inert = false;
    };
  }, [active]);
}

interface FocusTrapOptions {
  initialFocusRef?: RefObject<HTMLElement>;
  isTop: (kinds?: LayerKind[]) => boolean;
}

/**
 * Moves focus into `containerRef` when activated, keeps Tab / Shift+Tab inside it and restores
 * focus to the previously focused element when deactivated.
 *
 * Initial focus: `initialFocusRef` → `[data-autofocus]` → first tabbable element that is not the
 * header close button (`[data-overlay-close]`) → the container itself.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  active: boolean,
  { initialFocusRef, isTop }: FocusTrapOptions,
) {
  // The opener is captured during the render that opens the trap — before any `autoFocus`
  // element inside the dialog can steal focus during commit.
  const openerRef = useRef<HTMLElement | null>(null);
  const wasActive = useRef(false);
  if (active && !wasActive.current && typeof document !== 'undefined') {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasActive.current = active;

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;
    const opener = openerRef.current;

    // Respect an element that already took focus (autoFocus); otherwise pick the initial target.
    if (!container.contains(document.activeElement)) {
      const initial =
        initialFocusRef?.current ??
        container.querySelector<HTMLElement>('[data-autofocus]') ??
        getTabbable(container).find((element) => !element.hasAttribute('data-overlay-close')) ??
        container;
      initial.focus({ preventScroll: true });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !isTop(['modal', 'popover'])) return;
      const tabbable = getTabbable(container);
      if (tabbable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = tabbable[0];
      const last = tabbable[tabbable.length - 1];
      const current = document.activeElement;
      const outside = !current || !container.contains(current);
      if (event.shiftKey && (outside || current === first || current === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || current === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
    // The initial focus target is resolved once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
