import { createContext, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  /** info (default) · success · warning · error */
  tone?: ToastTone;
  /** Auto-dismiss delay in ms (default 5000). 0 keeps the toast until dismissed. */
  duration?: number;
}

export interface ToastApi {
  toast: (options: ToastOptions) => void;
  success: (title: ReactNode, description?: ReactNode) => void;
  error: (title: ReactNode, description?: ReactNode) => void;
  info: (title: ReactNode, description?: ReactNode) => void;
  warning: (title: ReactNode, description?: ReactNode) => void;
}

/** Internal: provided by <ToastProvider>, read with useToast(). */
export const ToastContext = createContext<ToastApi | null>(null);
