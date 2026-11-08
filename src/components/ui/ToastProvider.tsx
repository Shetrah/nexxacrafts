import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';
import { Portal } from './internal/Portal';
import { ToastContext, type ToastApi, type ToastOptions, type ToastTone } from './toastContext';

export interface ToastProviderProps {
  children: ReactNode;
  /** Maximum toasts on screen; the oldest is removed first (default 4). */
  max?: number;
}

interface ToastRecord {
  id: number;
  title: ReactNode;
  description?: ReactNode;
  tone: ToastTone;
  duration: number;
}

const DEFAULT_DURATION = 5000;

const TONE_ICON = {
  success: { Icon: CheckCircle2, className: 'text-success-600' },
  error: { Icon: AlertCircle, className: 'text-danger-600' },
  warning: { Icon: AlertTriangle, className: 'text-warning-600' },
  info: { Icon: Info, className: 'text-brand-600' },
} as const;

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(toast.duration);
  const { Icon, className: iconClass } = TONE_ICON[toast.tone];
  const paused = hovered || focused;

  // Auto-dismiss, paused while hovered or focused (remaining time is kept).
  useEffect(() => {
    if (paused || toast.duration <= 0 || !Number.isFinite(toast.duration)) return undefined;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), Math.max(remaining.current, 0));
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [paused, toast.duration, toast.id, onDismiss]);

  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className="surface-light pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-white p-4 text-slate-700 shadow-lg animate-slide-in-up motion-reduce:animate-none"
    >
      <Icon aria-hidden="true" className={cn('mt-px size-5 shrink-0', iconClass)} />
      <div className="min-w-0 flex-1 break-words">
        <p className="text-sm font-semibold leading-5 text-slate-900">{toast.title}</p>
        {toast.description && <div className="mt-0.5 text-sm leading-5 text-slate-600">{toast.description}</div>}
      </div>
      <IconButton
        label="Dismiss notification"
        icon={<X />}
        size="sm"
        onClick={() => onDismiss(toast.id)}
        className="-my-1.5 -mr-2"
      />
    </li>
  );
}

/**
 * Hosts toast notifications (bottom-right; bottom, full-width on phones). Wrap the app once:
 * `<ToastProvider><App /></ToastProvider>`, then call `useToast()`.
 *
 * Accessibility: errors are announced assertively, everything else politely. Toasts dismiss
 * after 5 s, pausing while hovered or focused.
 */
export function ToastProvider({ children, max = 4 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const push = ({ title, description, tone = 'info', duration = DEFAULT_DURATION }: ToastOptions) => {
      const record: ToastRecord = { id: nextId.current, title, description, tone, duration };
      nextId.current += 1;
      setToasts((list) => [...list, record].slice(-Math.max(1, max)));
    };
    return {
      toast: push,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'error' }),
      info: (title, description) => push({ title, description, tone: 'info' }),
      warning: (title, description) => push({ title, description, tone: 'warning' }),
    };
  }, [max]);

  const errors = toasts.filter((toast) => toast.tone === 'error');
  const others = toasts.filter((toast) => toast.tone !== 'error');

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Portal>
        <section
          aria-label="Notifications"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-70 flex flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-0 sm:w-[25rem] sm:p-6"
        >
          {/* Two persistent live regions: errors interrupt, everything else waits its turn. */}
          <ol aria-live="assertive" aria-relevant="additions" className="flex flex-col gap-2">
            {errors.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </ol>
          <ol aria-live="polite" aria-relevant="additions" className="flex flex-col gap-2">
            {others.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </ol>
        </section>
      </Portal>
    </ToastContext.Provider>
  );
}
