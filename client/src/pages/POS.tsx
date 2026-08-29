import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type {
  CartLine,
  Category,
  DiscountType,
  InventoryStatus,
  InventoryView,
  Order,
  PaymentMethod,
  ProductWithCategory,
} from '../types';
import { Modal } from '../components/Modal';

const DEFAULT_TAX_RATE = 0.0825;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function POS() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [statusMap, setStatusMap] = useState<Map<string, InventoryStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState('');

  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [receipt, setReceipt] = useState<Order | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.products.list({ limit: 1000 }),
      api.categories.list(),
      api.inventory.list({ limit: 1000 }),
    ])
      .then(([prodRes, cats, invRes]) => {
        setProducts(prodRes.data);
        setCategories(cats);
        const sm = new Map<string, number>();
        const stm = new Map<string, InventoryStatus>();
        invRes.data.forEach((i: InventoryView) => {
          sm.set(i.productId, i.quantityOnHand);
          stm.set(i.productId, i.status);
        });
        setStockMap(sm);
        setStatusMap(stm);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load POS data'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.categoryId !== category) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle)
      );
    });
  }, [products, q, category]);

  const summary = useMemo(() => {
    const subtotal = round2(cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
    const value = Number(discountValue) || 0;
    let discountTotal = 0;
    if (discountType === 'percent') discountTotal = round2(subtotal * (value / 100));
    else if (discountType === 'amount') discountTotal = round2(value);
    discountTotal = Math.min(Math.max(discountTotal, 0), subtotal);
    const taxable = round2(subtotal - discountTotal);
    const taxTotal = round2(taxable * DEFAULT_TAX_RATE);
    const total = round2(taxable + taxTotal);
    return { subtotal, discountTotal, taxRate: DEFAULT_TAX_RATE, taxTotal, total };
  }, [cart, discountType, discountValue]);

  const addToCart = (p: ProductWithCategory) => {
    const onHand = stockMap.get(p.id) ?? 0;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.quantity >= onHand) return prev;
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      if (onHand <= 0) return prev;
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          unitPrice: p.price,
          quantity: 1,
          stockOnHand: onHand,
        },
      ];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: l.quantity + delta }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType('none');
    setDiscountValue('');
  };

  const openPay = () => {
    setPayError(null);
    setPayMethod('cash');
    setTendered(summary.total.toFixed(2));
    setPayOpen(true);
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setPayError(null);
    try {
      const order = await api.orders.create({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        discountType,
        discountValue: discountValue ? Number(discountValue) : 0,
        taxRate: DEFAULT_TAX_RATE,
        paymentMethod: payMethod,
        amountTendered: payMethod === 'cash' ? Number(tendered) : null,
      });
      setReceipt(order);
      setPayOpen(false);
      clearCart();
      const invRes = await api.inventory.list({ limit: 1000 });
      const sm = new Map<string, number>();
      const stm = new Map<string, InventoryStatus>();
      invRes.data.forEach((i: InventoryView) => {
        sm.set(i.productId, i.quantityOnHand);
        stm.set(i.productId, i.status);
      });
      setStockMap(sm);
      setStatusMap(stm);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to complete sale');
    } finally {
      setSubmitting(false);
    }
  };

  // keep tendered synced to total while cash modal is open
  useEffect(() => {
    if (payOpen && payMethod === 'cash' && tendered === '') {
      setTendered(summary.total.toFixed(2));
    }
  }, [payOpen, payMethod, tendered, summary.total]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Point of Sale</h2>
          <p className="text-sm text-gray-500">Tap products to add them to the cart</p>
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Product grid */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products by name or SKU…"
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
          </div>

          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400 shadow-sm">
              Loading products…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400 shadow-sm">
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const onHand = stockMap.get(p.id) ?? 0;
                const out = onHand <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={out}
                    onClick={() => addToCart(p)}
                    className={`flex flex-col rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-sky-400 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 ${
                      out ? '' : 'hover:bg-sky-50'
                    }`}
                  >
                    <span className="truncate text-sm font-medium text-gray-900" title={p.name}>
                      {p.name}
                    </span>
                    <span className="text-xs text-gray-400">{p.sku}</span>
                    <span className="mt-2 text-base font-semibold text-gray-900">
                      {money(p.price)}
                    </span>
                    <span
                      className={`mt-1 text-xs font-medium ${
                        statusMap.get(p.id) === 'out'
                          ? 'text-red-600'
                          : statusMap.get(p.id) === 'low'
                            ? 'text-amber-600'
                            : 'text-green-600'
                      }`}
                    >
                      {out ? 'Out of stock' : `${onHand} in stock`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <aside className="w-full shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm lg:w-80">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-gray-900">Cart</h3>
          </div>

          {cart.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Cart is empty</p>
          ) : (
            <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
              {cart.map((l) => (
                <li key={l.productId} className="flex items-center gap-2 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{l.name}</p>
                    <p className="text-xs text-gray-400">{money(l.unitPrice)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(l.productId, -1)}
                      className="h-6 w-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{l.quantity}</span>
                    <button
                      onClick={() => changeQty(l.productId, 1)}
                      disabled={l.quantity >= l.stockOnHand}
                      className="h-6 w-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-16 text-right text-sm font-medium text-gray-900">
                    {money(l.unitPrice * l.quantity)}
                  </span>
                  <button
                    onClick={() => removeLine(l.productId)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Remove ${l.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-gray-200 px-4 py-3">
            <div className="flex gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              >
                <option value="none">No discount</option>
                <option value="percent">% off</option>
                <option value="amount">$ off</option>
              </select>
              {discountType !== 'none' && (
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percent' ? '0-100' : '0.00'}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                />
              )}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{money(summary.subtotal)}</span>
              </div>
              {summary.discountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{money(summary.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax ({(DEFAULT_TAX_RATE * 100).toFixed(2)}%)</span>
                <span>{money(summary.taxTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{money(summary.total)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={openPay}
                disabled={cart.length === 0}
                className="flex-1 rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
              >
                Charge
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Payment modal */}
      <Modal
        open={payOpen}
        title="Payment"
        onClose={() => !submitting && setPayOpen(false)}
        footer={
          <>
            <button
              onClick={() => setPayOpen(false)}
              disabled={submitting}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={completeSale}
              disabled={submitting || cart.length === 0}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
            >
              {submitting ? 'Processing…' : `Complete ${money(summary.total)}`}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500">Amount due</span>
            <p className="text-2xl font-bold text-gray-900">{money(summary.total)}</p>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">Payment method</p>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'card', 'other'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`rounded border px-3 py-2 text-sm font-medium capitalize ${
                    payMethod === m
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {payMethod === 'cash' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Amount tendered
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              {Number(tendered) >= summary.total && (
                <p className="mt-1 text-sm text-green-600">
                  Change due: {money(Number(tendered) - summary.total)}
                </p>
              )}
            </div>
          )}

          {payError && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{payError}</div>
          )}
        </div>
      </Modal>

      {/* Receipt / confirmation modal */}
      <Modal
        open={receipt !== null}
        title="Sale complete"
        onClose={() => setReceipt(null)}
        footer={
          <button
            onClick={() => setReceipt(null)}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            New sale
          </button>
        }
      >
        {receipt && <ReceiptView order={receipt} onPrint={() => window.print()} />}
      </Modal>
    </div>
  );
}

function ReceiptView({ order, onPrint }: { order: Order; onPrint: () => void }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded border border-gray-200 bg-gray-50 p-3 text-center">
        <p className="font-semibold text-gray-900">Peoples Market &amp; Liquor</p>
        <p className="text-xs text-gray-500">{order.orderNumber}</p>
        <p className="text-xs text-gray-500">
          {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      <table className="w-full">
        <tbody className="divide-y divide-gray-100">
          {order.items.map((i) => (
            <tr key={i.id}>
              <td className="py-1">
                <span className="font-medium text-gray-900">{i.quantity}×</span> {i.name}
              </td>
              <td className="py-1 text-right text-gray-700">{money(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 border-t border-gray-200 pt-2">
        <Row label="Subtotal" value={money(order.subtotal)} />
        {order.discountTotal > 0 && (
          <Row label="Discount" value={`-${money(order.discountTotal)}`} />
        )}
        <Row label={`Tax (${(order.taxRate * 100).toFixed(2)}%)`} value={money(order.taxTotal)} />
        <Row label="Total" value={money(order.total)} bold />
        <Row label="Payment" value={order.paymentMethod.toUpperCase()} />
        {order.paymentMethod === 'cash' && order.amountTendered !== null && (
          <>
            <Row label="Tendered" value={money(order.amountTendered)} />
            <Row label="Change" value={money(order.changeDue ?? 0)} />
          </>
        )}
      </div>

      <button
        onClick={onPrint}
        className="w-full rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        Print receipt
      </button>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
