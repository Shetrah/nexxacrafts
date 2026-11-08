import { useId, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';
import { DialogRoot } from './internal/DialogRoot';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Dialog title (labels the dialog). */
  title: ReactNode;
  /** Supporting line under the title (describes the dialog). */
  description?: ReactNode;
  /** sm 384px · md 512px (default) · lg 672px · xl 896px */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: ReactNode;
  /** Action row; buttons stack full-width on phones (put the primary action last). */
  footer?: ReactNode;
  /** Element to focus on open. Default: `[data-autofocus]`, else the first focusable field. */
  initialFocusRef?: RefObject<HTMLElement>;
  /** Close when the backdrop is clicked (default true). */
  closeOnOverlayClick?: boolean;
  /** Icon tile shown before the title (e.g. a warning icon for destructive confirmations). */
  icon?: ReactNode;
  /** Colour of the icon tile (default brand). */
  iconTone?: 'brand' | 'danger' | 'warning' | 'neutral';
  /** Use "alertdialog" for confirmations that interrupt the user. */
  role?: 'dialog' | 'alertdialog';
  /** Hide the header close button (Escape and the footer must still offer a way out). */
  hideCloseButton?: boolean;
}

const ICON_TONES = {
  brand: 'bg-brand-50 text-brand-700',
  danger: 'bg-danger-50 text-danger-600',
  warning: 'bg-warning-50 text-warning-700',
  neutral: 'bg-slate-100 text-slate-600',
} as const;

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
} as const;

/**
 * Centred dialog (bottom sheet on phones). Focus is trapped and restored, Escape closes, the page
 * behind is inert and does not scroll.
 *
 * @example
 * <Modal open={open} onClose={() => setOpen(false)} title="Edit rate" footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={save}>Save</Button></>}>
 *   …
 * </Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  initialFocusRef,
  closeOnOverlayClick = true,
  icon,
  iconTone = 'brand',
  role = 'dialog',
  hideCloseButton = false,
}: ModalProps) {
  const id = useId();
  const titleId = `${id}modal-title`;
  const descriptionId = description ? `${id}modal-description` : undefined;
  const hasBody = children !== undefined && children !== null && children !== false;

  return (
    <DialogRoot
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      role={role}
      initialFocusRef={initialFocusRef}
      closeOnOverlayClick={closeOnOverlayClick}
      containerClassName="items-end justify-center overflow-y-auto sm:items-center sm:p-6"
      panelClassName={cn(
        'flex max-h-[calc(100vh-1rem)] w-full flex-col rounded-t-2xl bg-white shadow-xl supports-[height:100dvh]:max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl sm:shadow-lg supports-[height:100dvh]:sm:max-h-[calc(100dvh-3rem)]',
        'animate-slide-in-up sm:animate-scale-in motion-reduce:animate-none',
        SIZES[size],
      )}
    >
      <header className={cn('flex items-start gap-4 px-5 pt-5 sm:px-6 sm:pt-6', hasBody || footer ? 'pb-2' : 'pb-5 sm:pb-6')}>
        {icon && (
          <span
            aria-hidden="true"
            className={cn('grid size-10 shrink-0 place-items-center rounded-full [&>svg]:size-5', ICON_TONES[iconTone])}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1 pt-px">
          <h2 id={titleId} className="text-lg font-bold leading-7">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>
        {!hideCloseButton && (
          <IconButton
            label="Close"
            icon={<X />}
            size="sm"
            onClick={onClose}
            data-overlay-close=""
            className="-mr-1.5 -mt-0.5"
          />
        )}
      </header>
      {hasBody && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 text-sm leading-6 sm:px-6">{children}</div>}
      {footer && (
        <footer className="mt-2 flex flex-col-reverse gap-2 rounded-b-none border-t border-line bg-slate-50/80 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-center sm:justify-end sm:rounded-b-2xl sm:px-6 sm:pb-4 [&>*]:w-full sm:[&>*]:w-auto">
          {footer}
        </footer>
      )}
    </DialogRoot>
  );
}
