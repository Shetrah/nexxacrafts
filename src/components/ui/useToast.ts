import { useContext } from 'react';
import { ToastContext, type ToastApi } from './toastContext';

const noop = () => undefined;
const NOOP_API: ToastApi = { toast: noop, success: noop, error: noop, info: noop, warning: noop };
let warnedMissingProvider = false;

/**
 * Shows toasts from anywhere under <ToastProvider>.
 *
 * Outside a provider it returns a no-op API (and logs one console error in development) rather
 * than crashing the page.
 *
 * @example
 * const toast = useToast();
 * toast.success('Order submitted', `Reference ${reference}`);
 * toast.error('Could not save', getErrorMessage(error));
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api) return api;
  if (import.meta.env.DEV && !warnedMissingProvider) {
    warnedMissingProvider = true;
    console.error('useToast() was called outside <ToastProvider>; toasts will not be shown.');
  }
  return NOOP_API;
}
