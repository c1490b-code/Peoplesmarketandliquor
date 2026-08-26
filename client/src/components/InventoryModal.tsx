import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { InventoryView, InventoryPatch } from '../types';

interface InventoryModalProps {
  open: boolean;
  item: InventoryView | null;
  onClose: () => void;
  onSubmit: (patch: InventoryPatch) => Promise<void>;
}

export function InventoryModal({ open, item, onClose, onSubmit }: InventoryModalProps) {
  const [form, setForm] = useState({
    quantityOnHand: 0,
    reorderLevel: 0,
    lowStockThreshold: 0,
    location: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      setError(null);
      setForm({
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        lowStockThreshold: item.lowStockThreshold,
        location: item.location,
      });
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.quantityOnHand < 0) return setError('Quantity cannot be negative');
    setSaving(true);
    try {
      await onSubmit({
        quantityOnHand: form.quantityOnHand,
        reorderLevel: form.reorderLevel,
        lowStockThreshold: form.lowStockThreshold,
        location: form.location,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={item ? `Update Inventory: ${item.product?.name ?? item.productId}` : 'Update Inventory'}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="inventory-form"
            disabled={saving}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantity on hand</label>
          <input
            type="number"
            min="0"
            value={form.quantityOnHand}
            onChange={(e) => setForm((f) => ({ ...f, quantityOnHand: Number(e.target.value) }))}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Reorder level</label>
            <input
              type="number"
              min="0"
              value={form.reorderLevel}
              onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Low stock threshold</label>
            <input
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={(e) =>
                setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </form>
    </Modal>
  );
}
