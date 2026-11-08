import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Runs on confirm. If it returns a promise, the confirm button shows a spinner and the dialog
   * cannot be dismissed until it settles. Close the dialog yourself when done (e.g. in onConfirm).
   */
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  /** Default "Confirm". Use a verb: "Cancel order", "Delete rate". */
  confirmLabel?: string;
  /** Default "Cancel". */
  cancelLabel?: string;
  /** primary (default) · danger (destructive: red button + warning icon) */
  tone?: 'primary' | 'danger';
  /** External busy state (in addition to the promise returned by onConfirm). */
  loading?: boolean;
  /** Extra content (e.g. a reason field). */
  children?: ReactNode;
}

/**
 * Confirmation for destructive or state-changing actions (`role="alertdialog"`). Focus starts on
 * the cancel button.
 *
 * @example <ConfirmDialog open={confirming} onClose={() => setConfirming(false)} onConfirm={cancelOrder} tone="danger" title="Cancel this order?" description="The customer is notified by email." confirmLabel="Cancel order" />
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  children,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  const busy = loading || pending;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleConfirm = async () => {
    if (busy) return;
    const result: unknown = onConfirm();
    if (!(result instanceof Promise)) return;
    setPending(true);
    try {
      await result;
    } finally {
      if (mounted.current) setPending(false);
    }
  };

  const handleClose = () => {
    if (!busy) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size="sm"
      role="alertdialog"
      initialFocusRef={cancelRef}
      closeOnOverlayClick={!busy}
      icon={tone === 'danger' ? <AlertTriangle /> : undefined}
      iconTone="danger"
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={handleClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
