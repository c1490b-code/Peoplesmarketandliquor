import type { InventoryStatus } from '../types';

const styles: Record<InventoryStatus, string> = {
  out: 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-900/60 dark:text-red-100 dark:ring-red-700',
  low: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/60 dark:text-amber-100 dark:ring-amber-700',
  ok: 'bg-green-100 text-green-700 ring-1 ring-green-200 dark:bg-green-900/60 dark:text-green-100 dark:ring-green-700',
};

const labels: Record<InventoryStatus, string> = {
  out: 'Out of stock',
  low: 'Low stock',
  ok: 'In stock',
};

export function StatusBadge({ status }: { status: InventoryStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
