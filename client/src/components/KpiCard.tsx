import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  hint?: string;
}

export function KpiCard({ label, value, icon, hint }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</div>}
    </div>
  );
}
