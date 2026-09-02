import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../api';
import type { DashboardPeriod, SalesDataPoint } from '../types';
import { Spinner } from './Feedback';

const PERIODS: DashboardPeriod[] = ['daily', 'weekly', 'monthly'];

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function tickFormatter(value: string, period: DashboardPeriod): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  if (period === 'monthly') {
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function currencyFormatter(value: unknown, name: unknown): [string, string] {
  const label = name ? String(name) : '';
  if (typeof value === 'number') {
    return [currency.format(value), label];
  }
  return [String(value), label];
}

export function SalesChart() {
  const [period, setPeriod] = useState<DashboardPeriod>('monthly');
  const [data, setData] = useState<SalesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.dashboard
      .sales({ period, limit: 40 })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load sales');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        period: tickFormatter(d.period, period),
      })),
    [data, period],
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sales over time</h3>
        <div className="flex gap-1 rounded bg-gray-100 p-1 text-xs font-medium dark:bg-gray-800">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={
                period === p
                  ? 'rounded bg-sky-600 px-3 py-1.5 text-white'
                  : 'rounded px-3 py-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }
            >
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
          <Spinner size="sm" />
          <span>Loading sales…</span>
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-gray-400 dark:text-gray-500">No sales data</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.15} />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="currentColor" />
            <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
            <Tooltip formatter={currencyFormatter} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#0284c7"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
