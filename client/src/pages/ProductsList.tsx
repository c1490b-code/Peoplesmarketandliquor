import { useEffect, useState } from 'react';
import { api } from '../api';
import type {
  Category,
  InventoryStatus,
  Product,
  ProductInput,
  ProductQuery,
  ProductWithCategory,
} from '../types';
import { ProductForm } from '../components/ProductForm';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../components/Feedback';
import { useToast } from '../components/toastContext';

type SortKey = 'name' | 'priceAsc' | 'priceDesc' | 'sku' | 'newest';

export function ProductsList() {
  const [items, setItems] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockStatus, setStockStatus] = useState<Map<string, InventoryStatus>>(new Map());
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [refreshingStock, setRefreshingStock] = useState(false);
  const toast = useToast();

  const load = async (query: ProductQuery) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.products.list(query);
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.categories
      .list()
      .then(setCategories)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load categories'));
  }, []);

  useEffect(() => {
    load({ q, category, sort, page, limit });
  }, [q, category, sort, page, limit]);

  useEffect(() => {
    if (category || q) setPage(1);
  }, [category, q]);

  useEffect(() => {
    setRefreshingStock(true);
    api.inventory
      .list({ lowStock: true, limit: 1000 })
      .then((res) => {
        const map = new Map<string, InventoryStatus>();
        res.data.forEach((i) => map.set(i.productId, i.status));
        setStockStatus(map);
      })
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => setRefreshingStock(false));
  }, [items]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const handleSubmit = async (input: ProductInput) => {
    try {
      if (editing) {
        await api.products.update(editing.id, input);
        toast.success(`Updated "${input.name}"`);
      } else {
        await api.products.create(input);
        toast.success(`Added "${input.name}"`);
      }
      setFormOpen(false);
      setPage(1);
      const res = await api.products.list({ q, category, sort, page: 1, limit });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product');
      throw err;
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api.products.remove(product.id);
      toast.success(`Deleted "${product.name}"`);
      const res = await api.products.list({ q, category, sort, page, limit });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Products</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your product catalog
          </p>
        </div>
        <button
          onClick={openAdd}
          className="self-start rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 sm:self-auto"
        >
          + Add Product
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, SKU, or description…"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:max-w-xs"
        />
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
          <option value="name">Sort: Name</option>
          <option value="sku">Sort: SKU</option>
          <option value="priceAsc">Sort: Price ↑</option>
          <option value="priceDesc">Sort: Price ↓</option>
          <option value="newest">Sort: Newest</option>
        </select>
        {refreshingStock && <Spinner size="sm" className="self-center text-gray-400" />}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorState
            title="Couldn't load products"
            error={error}
            onRetry={() => load({ q, category, sort, page, limit })}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <LoadingState message="Loading products…" />
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No products found"
              description="Adjust filters or add your first product to get started."
              action={
                <button
                  onClick={openAdd}
                  className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                >
                  + Add Product
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((p) => {
                    const status = stockStatus.get(p.id);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {p.name}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.sku}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {p.category?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                          ${p.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">{status && <StatusBadge status={status} />}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openEdit(p)}
                            className="mr-2 font-medium text-sky-600 hover:underline dark:text-sky-400"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="font-medium text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

      <ProductForm
        open={formOpen}
        product={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
