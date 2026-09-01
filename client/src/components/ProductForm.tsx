import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { Category, Product, ProductInput } from '../types';

interface ProductFormProps {
  open: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<void>;
}

const empty: ProductInput = {
  name: '',
  sku: '',
  categoryId: null,
  price: 0,
  cost: 0,
  unit: 'each',
  description: '',
};

const inputClass =
  'mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200';

export function ProductForm({ open, product, categories, onClose, onSubmit }: ProductFormProps) {
  const [form, setForm] = useState<ProductInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        product
          ? {
              name: product.name,
              sku: product.sku,
              categoryId: product.categoryId,
              price: product.price,
              cost: product.cost,
              unit: product.unit,
              description: product.description,
            }
          : empty,
      );
    }
  }, [open, product]);

  const update = (key: keyof ProductInput, value: ProductInput[keyof ProductInput]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Name is required');
    if (!form.sku.trim()) return setError('SKU is required');
    if (form.price < 0) return setError('Price cannot be negative');
    if (form.cost < 0) return setError('Cost cannot be negative');
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={product ? 'Edit Product' : 'Add Product'}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-100">
          {error}
        </div>
      )}
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Name</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>SKU</label>
            <input
              value={form.sku}
              onChange={(e) => update('sku', e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.categoryId ?? ''}
              onChange={(e) => update('categoryId', e.target.value || null)}
              className={inputClass}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => update('price', Number(e.target.value))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Cost ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cost}
              onChange={(e) => update('cost', Number(e.target.value))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Unit</label>
            <input
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
