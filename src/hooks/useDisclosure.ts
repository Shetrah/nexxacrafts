import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

export interface Disclosure {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * Open/closed state for modals, drawers, menus and disclosures. All callbacks are stable.
 *
 * @example
 * const drawer = useDisclosure();
 * <Button onClick={drawer.open}>Details</Button>
 * <Drawer open={drawer.isOpen} onClose={drawer.close}>…</Drawer>
 */
export function useDisclosure(initial = false): Disclosure {
  const [isOpen, setOpen] = useState(initial);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  return useMemo(() => ({ isOpen, open, close, toggle, setOpen }), [isOpen, open, close, toggle]);
}
