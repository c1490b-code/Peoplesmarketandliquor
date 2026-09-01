import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext, type Toast, type ToastKind } from './toastContext';

const STYLE_BY_KIND: Record<ToastKind, string> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-100',
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/60 dark:text-red-100',
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/60 dark:text-sky-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-100',
};

const ICON_BY_KIND: Record<ToastKind, string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '!',
};

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = 'info', duration: number = DEFAULT_DURATION) => {
      seq.current += 1;
      const id = seq.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toasts,
      push,
      dismiss,
      success: (m: string) => push(m, 'success'),
      error: (m: string) => push(m, 'error', 6000),
      info: (m: string) => push(m, 'info'),
      warning: (m: string) => push(m, 'warning'),
    }),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:right-6 sm:left-auto"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur ${STYLE_BY_KIND[t.kind]}`}
        >
          <span
            className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/70 text-xs font-bold dark:bg-black/30"
            aria-hidden="true"
          >
            {ICON_BY_KIND[t.kind]}
          </span>
          <p className="flex-1 text-sm font-medium">{t.message}</p>
          <button
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
            className="rounded p-1 text-current opacity-60 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
