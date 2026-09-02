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
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { useToast } from '../components/toastContext';

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
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const query: InventoryQuery = {
        category,
        lowStock: lowStockOnly,
        sort,
        page,
        limit,
      };
      const res = await api.inventory.list(query);
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.categories
      .list()
      .then(setCategories)
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to load categories'),
      );
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
    try {
      await api.inventory.update(active.id, patch);
      toast.success(
        `Updated inventory for ${active.product?.name ?? active.productId}`,
      );
      setModalOpen(false);
      setActive(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update inventory');
      throw err;
    }
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
      <div className="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Inventory</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track stock levels
            {lowCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/60 dark:text-amber-100">
                {lowCount} low / out
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"
          />
          Low stock only
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="status">Sort: Need attention</option>
          <option value="name">Sort: Name</option>
          <option value="stockAsc">Sort: Stock ↑</option>
          <option value="stockDesc">Sort: Stock ↓</option>
        </select>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorState
            title="Couldn't load inventory"
            error={error}
            onRetry={load}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <LoadingState message="Loading inventory…" />
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No inventory items"
              description={
                lowStockOnly
                  ? 'No items are at or below their low-stock threshold.'
                  : 'Add products to start tracking inventory.'
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">On hand</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {item.product?.name ?? item.productId}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {item.quantityOnHand}
                      </td>
                      <td className="w-40 px-4 py-3">{stockBar(item)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {item.location || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openAdjust(item)}
                          className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </>
        )}
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
