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

  useEffect(() => {
    api.categories
      .list()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const query: ProductQuery = { q, category, sort, page, limit };
    setLoading(true);
    setError(null);
    api.products
      .list(query)
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoading(false));
  }, [q, category, sort, page, limit]);

  useEffect(() => {
    if (category || q) setPage(1);
  }, [category, q]);

  useEffect(() => {
    api.inventory
      .list({ lowStock: true, limit: 1000 })
      .then((res) => {
        const map = new Map<string, InventoryStatus>();
        res.data.forEach((i) => map.set(i.productId, i.status));
        setStockStatus(map);
      })
      .catch(() => {});
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
    if (editing) {
      await api.products.update(editing.id, input);
    } else {
      await api.products.create(input);
    }
    setFormOpen(false);
    setPage(1);
    const query: ProductQuery = { q, category, sort, page: 1, limit };
    const res = await api.products.list(query);
    setItems(res.data);
    setTotal(res.total);
    setTotalPages(res.totalPages);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api.products.remove(product.id);
      const res = await api.products.list({ q, category, sort, page, limit });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500">Manage your product catalog</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          + Add Product
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, SKU, or description…"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
        />
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
          <option value="name">Sort: Name</option>
          <option value="sku">Sort: SKU</option>
          <option value="priceAsc">Sort: Price ↑</option>
          <option value="priceDesc">Sort: Price ↓</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3">Stock</th>
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
                  No products found
                </td>
              </tr>
            ) : (
              items.map((p) => {
                const status = stockStatus.get(p.id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      ${p.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {status && <StatusBadge status={status} />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="mr-2 text-sky-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
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
