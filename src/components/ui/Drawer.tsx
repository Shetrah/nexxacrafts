import { useId, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';
import { DialogRoot } from './internal/DialogRoot';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** right (default) · left */
  side?: 'right' | 'left';
  /** Width from `sm` up: sm 384px · md 448px (default) · lg 576px · xl 768px. Full width on phones. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: ReactNode;
  /** Sticky action row at the bottom. */
  footer?: ReactNode;
  /** Extra header buttons (e.g. a "More" menu) placed before the close button. */
  headerActions?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement>;
  closeOnOverlayClick?: boolean;
}

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-3xl',
} as const;

/**
 * Side sheet for record details and secondary flows. Header and footer stay put; the body scrolls.
 *
 * @example <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.reference} size="lg">…</Drawer>
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  side = 'right',
  size = 'md',
  children,
  footer,
  headerActions,
  initialFocusRef,
  closeOnOverlayClick = true,
}: DrawerProps) {
  const id = useId();
  const titleId = `${id}drawer-title`;
  const descriptionId = description ? `${id}drawer-description` : undefined;

  return (
    <DialogRoot
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={initialFocusRef}
      closeOnOverlayClick={closeOnOverlayClick}
      containerClassName={side === 'right' ? 'justify-end' : 'justify-start'}
      panelClassName={cn(
        'flex h-full w-full flex-col bg-white shadow-xl motion-reduce:animate-none',
        side === 'right' ? 'animate-slide-in-right sm:border-l' : 'animate-slide-in-left sm:border-r',
        'border-line',
        SIZES[size],
      )}
    >
      <header className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id={titleId} className="truncate text-base font-bold leading-6">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-0.5 text-sm leading-5 text-slate-600">
              {description}
            </p>
          )}
        </div>
        <div className="-mr-1.5 flex shrink-0 items-center gap-1">
          {headerActions}
          <IconButton label="Close" icon={<X />} size="sm" onClick={onClose} data-overlay-close="" />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 text-sm leading-6">{children}</div>
      {footer && (
        <footer className="flex flex-col-reverse gap-2 border-t border-line bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-center sm:justify-end sm:pb-4 [&>*]:w-full sm:[&>*]:w-auto">
          {footer}
        </footer>
      )}
    </DialogRoot>
  );
}
