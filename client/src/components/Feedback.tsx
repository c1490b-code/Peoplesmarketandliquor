import type { ReactNode } from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const SIZE_CLASS: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
};

export function Spinner({ size = 'md', className = '', label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={`inline-block animate-spin rounded-full border-current border-t-transparent text-sky-600 dark:text-sky-400 ${SIZE_CLASS[size]} ${className}`}
    />
  );
}

interface LoadingStateProps {
  label?: string;
  message?: string;
  className?: string;
}

export function LoadingState({
  label = 'Loading',
  message,
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 text-sm text-gray-500 dark:text-gray-400 ${className}`}
    >
      <Spinner size="lg" label={label} />
      <span>{message ?? 'Loading…'}</span>
    </div>
  );
}

interface InlineLoadingProps {
  label?: string;
  className?: string;
}

export function InlineLoading({ label = 'Loading', className = '' }: InlineLoadingProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}
    >
      <Spinner size="sm" label={label} />
      <span>{label}…</span>
    </span>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      {icon && <div className="text-3xl text-gray-400">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-100 ${className}`}
      role="alert"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-red-700 dark:text-red-200">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="self-start rounded border border-red-300 px-3 py-1 text-sm font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/60"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
