import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type {
  DashboardSummary,
  LowStockProduct,
  Order,
  TopProduct,
  TopProductSort,
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { SalesChart } from '../components/SalesChart';
import { KpiCard } from '../components/KpiCard';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const numberFmt = new Intl.NumberFormat('en-US');

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function kpi(value: number): string {
  return numberFmt.format(value);
}

export function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.dashboard.summary(),
      api.dashboard.topProducts({ limit: 5 }),
      api.dashboard.lowStock(),
      api.dashboard.recentOrders({ limit: 10 }),
      api.customers.list({ limit: 1000 }),
    ])
      .then(([summary, top, low, orders, custRes]) => {
        if (cancelled) return;
        setSummary(summary);
        setTopProducts(top);
        setLowStock(low);
        setRecentOrders(orders);
        const map = new Map<string, string>();
        custRes.data.forEach((c) => map.set(c.id, c.name));
        setCustomers(map);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const customerName = (id: string | null) =>
    id ? customers.get(id) ?? '—' : '—';

  const summaryCards = useMemo(() => {
    if (!summary) {
      return [
        { label: 'Total Sales', value: '—' },
        { label: 'Total Orders', value: '—' },
        { label: 'Avg Order Value', value: '—' },
        { label: 'Gross Margin', value: '—' },
      ];
    }
    return [
      { label: 'Total Sales', value: currency.format(summary.totalSales) },
      { label: 'Total Orders', value: kpi(summary.totalOrders) },
      {
        label: 'Avg Order Value',
        value: summary.totalOrders
          ? currency.format(summary.averageOrderValue)
          : '—',
      },
      { label: 'Gross Margin', value: pct(summary.grossMargin) },
    ];
  }, [summary]);

  const lowStockSeverity = (item: LowStockProduct): 'high' | 'medium' =>
    item.status === 'out' ? 'high' : 'medium';

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-400">Loading dashboard…</div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Analytics and reporting for Peoples Market &amp; Liquor
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <KpiCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="mb-6">
        <SalesChart />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Top selling products
            </h3>
            <label className="text-xs text-gray-500">
              <select
                defaultValue="revenue"
                onChange={(e) => {
                  const sort = e.target.value as TopProductSort;
                  api.dashboard
                    .topProducts({ limit: 5, sort })
                    .then((res) => setTopProducts(res))
                    .catch(() => {});
                }}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              >
                <option value="revenue">By revenue</option>
                <option value="quantity">By quantity</option>
                <option value="orders">By orders</option>
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      No products sold yet
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.sku}</div>
                      </td>
                      <td className="py-2 text-right text-gray-700">
                        {numberFmt.format(p.quantitySold)}
                      </td>
                      <td className="py-2 text-right text-gray-700">
                        {currency.format(p.revenue)}
                      </td>
                      <td className="py-2 text-right text-gray-700">
                        {currency.format(p.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Low stock alerts
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                lowStock.length === 0
                  ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
                  : 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
              }`}
            >
              {lowStock.length} alert{lowStock.length === 1 ? '' : 's'}
            </span>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              All products in stock
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {lowStock.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="mx-1 text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{item.sku}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium ${
                        lowStockSeverity(item) === 'high'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {numberFmt.format(item.quantityOnHand)} on hand
                      <span className="text-gray-400"> / {item.lowStockThreshold} min</span>
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <button
              onClick={() => navigate('/inventory')}
              className="text-sm text-sky-600 hover:underline"
            >
              View inventory →
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Recent orders
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="pb-2">Order</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Date</th>
                <th className="pb-2 text-right">Items</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    No orders yet
                  </td>
                </tr>
              ) : (
                  recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50"
                    >
                    <td className="py-2 font-medium text-gray-900">
                      {o.orderNumber}
                    </td>
                    <td className="py-2 text-gray-500">
                      {customerName(o.customerId)}
                    </td>
                    <td className="py-2 text-gray-500">{formatDate(o.createdAt)}</td>
                    <td className="py-2 text-right text-gray-700">
                      {numberFmt.format(
                        o.items.reduce((s, i) => s + i.quantity, 0),
                      )}
                    </td>
                    <td className="py-2 text-right text-gray-700">
                      {currency.format(o.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
