import { useRef, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { Portal } from './Portal';
import {
  useBodyScrollLock,
  useEscapeKey,
  useFocusTrap,
  useInertAppRoot,
  useOverlayLayer,
} from './layers';

export interface DialogRootProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  initialFocusRef?: RefObject<HTMLElement>;
  closeOnOverlayClick?: boolean;
  /** Layout of the fixed full-screen container (alignment, padding). */
  containerClassName?: string;
  /** Classes of the dialog panel itself. */
  panelClassName?: string;
  children: ReactNode;
}

/**
 * Shared modal behaviour for Modal and Drawer: portal, backdrop, focus trap + restore, Escape,
 * scroll lock, inert background and overlay click.
 */
export function DialogRoot({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  initialFocusRef,
  closeOnOverlayClick = true,
  containerClassName,
  panelClassName,
  children,
}: DialogRootProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pointerDownOutside = useRef(false);
  const isTop = useOverlayLayer(open, 'modal');

  // Order matters: on close the background becomes interactive again before focus is restored.
  useInertAppRoot(open);
  useBodyScrollLock(open);
  useFocusTrap(panelRef, open, { initialFocusRef, isTop });
  useEscapeKey(open, isTop, onClose);

  if (!open) return null;

  // Only real clicks on the backdrop close the dialog: not drags that started inside the panel,
  // and not clicks inside nested portals (menus) that bubble through the React tree.
  const isBackdropEvent = (event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) => {
    const target = event.target as Node;
    return event.currentTarget.contains(target) && !panelRef.current?.contains(target);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerDownOutside.current = isBackdropEvent(event);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && pointerDownOutside.current && isBackdropEvent(event)) onClose();
    pointerDownOutside.current = false;
  };

  return (
    <Portal>
      <div
        data-overlay-root=""
        className={cn('fixed inset-0 z-60 flex', containerClassName)}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in motion-reduce:animate-none"
        />
        <div
          ref={panelRef}
          role={role}
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={cn('surface-light relative text-slate-700 outline-none', panelClassName)}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
