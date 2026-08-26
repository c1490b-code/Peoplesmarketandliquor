import { useEffect, useState } from 'react';
import { api } from '../api';
import type {
  Category,
  InventoryPatch,
  InventoryQuery,
  InventoryView,
} from '../types';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { InventoryModal } from '../components/InventoryModal';

type SortKey = 'name' | 'stockAsc' | 'stockDesc' | 'status';

export function Inventory() {
  const [items, setItems] = useState<InventoryView[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('status');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<InventoryView | null>(null);
  const [lowCount, setLowCount] = useState(0);

  const load = () => {
    setLoading(true);
    setError(null);
    const query: InventoryQuery = {
      category,
      lowStock: lowStockOnly,
      sort,
      page,
      limit,
    };
    api.inventory
      .list(query)
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load inventory'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (category || lowStockOnly) setPage(1);
  }, [category, lowStockOnly]);

  useEffect(() => {
    load();
  }, [category, lowStockOnly, sort, page, limit]);

  useEffect(() => {
    api.inventory
      .list({ lowStock: true, limit: 1000 })
      .then((res) => setLowCount(res.total))
      .catch(() => {});
  }, [items]);

  const openAdjust = (item: InventoryView) => {
    setActive(item);
    setModalOpen(true);
  };

  const handlePatch = async (patch: InventoryPatch) => {
    if (!active) return;
    await api.inventory.update(active.id, patch);
    setModalOpen(false);
    setActive(null);
    load();
  };

  const stockBar = (item: InventoryView) => {
    const threshold = Math.max(item.lowStockThreshold, 1);
    const pct = Math.min(100, (item.quantityOnHand / (threshold * 3)) * 100);
    const color =
      item.status === 'out'
        ? 'bg-red-500'
        : item.status === 'low'
          ? 'bg-amber-500'
          : 'bg-green-500';
    return (
      <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-500">
            Track stock levels
            {lowCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {lowCount} low / out
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="status">Sort: Need attention</option>
          <option value="name">Sort: Name</option>
          <option value="stockAsc">Sort: Stock ↑</option>
          <option value="stockDesc">Sort: Stock ↓</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No inventory items
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.product?.name ?? item.productId}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.quantityOnHand}</td>
                  <td className="w-40 px-4 py-3">{stockBar(item)}</td>
                  <td className="px-4 py-3 text-gray-500">{item.location || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openAdjust(item)}
                      className="text-sky-600 hover:underline"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      <InventoryModal
        open={modalOpen}
        item={active}
        onClose={() => setModalOpen(false)}
        onSubmit={handlePatch}
      />
    </div>
  );
}
