import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Customer, CustomerInput, CustomerQuery } from '../types';
import { CustomerForm } from '../components/CustomerForm';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { useToast } from '../components/toastContext';

type SortKey = 'name' | 'newest' | 'oldest';

export function CustomersList() {
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = async (query: CustomerQuery) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.customers.list(query);
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ q, sort, page, limit });
  }, [q, sort, page, limit]);

  useEffect(() => {
    if (q) setPage(1);
  }, [q]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setFormOpen(true);
  };

  const handleSubmit = async (input: CustomerInput) => {
    try {
      if (editing) {
        await api.customers.update(editing.id, input);
        toast.success(`Updated "${input.name}"`);
      } else {
        await api.customers.create(input);
        toast.success(`Added "${input.name}"`);
      }
      setFormOpen(false);
      setPage(1);
      const res = await api.customers.list({ q, sort, page: 1, limit });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save customer');
      throw err;
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Delete "${customer.name}"? This cannot be undone.`)) return;
    try {
      await api.customers.remove(customer.id);
      toast.success(`Deleted "${customer.name}"`);
      const res = await api.customers.list({ q, sort, page, limit });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  const viewDetail = (id: string) => {
    navigate(`/customers/${id}`);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your customer base</p>
        </div>
        <button
          onClick={openAdd}
          className="self-start rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 sm:self-auto"
        >
          + Add Customer
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:max-w-xs"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="name">Sort: Name</option>
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
        </select>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorState
            title="Couldn't load customers"
            error={error}
            onRetry={() => load({ q, sort, page, limit })}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <LoadingState message="Loading customers…" />
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No customers found"
              description="Add your first customer to start tracking purchases and preferences."
              action={
                <button
                  onClick={openAdd}
                  className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                >
                  + Add Customer
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
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => viewDetail(c.id)}
                          className="text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.email}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.phone}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.address}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(c)}
                          className="mr-2 font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Delete
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

      <CustomerForm
        open={formOpen}
        customer={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
