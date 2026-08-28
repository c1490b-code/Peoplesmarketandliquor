import { Router, Request, Response } from 'express';
import { store } from '../data/store';
import { parsePositiveInt } from '../utils/pagination';
import { authMiddleware, requireRole } from '../middleware/auth';
import type {
  InventoryItem,
  InventoryPatch,
  InventoryView,
  Paginated,
  Product,
} from '../types';

function statusOf(item: InventoryItem): InventoryView['status'] {
  if (item.quantityOnHand <= 0) return 'out';
  if (item.quantityOnHand <= item.lowStockThreshold) return 'low';
  return 'ok';
}

function toView(item: InventoryItem, products: Product[]): InventoryView {
  return {
    ...item,
    product: products.find((p) => p.id === item.productId) ?? null,
    status: statusOf(item),
  };
}

export const inventoryRouter = Router();

inventoryRouter.get('/', (req: Request, res: Response) => {
  const products = store.listProducts();
  let items = store.listInventory().map((i) => toView(i, products));

  if (req.query.lowStock === 'true' || req.query.lowStock === '1') {
    items = items.filter((i) => i.status === 'low' || i.status === 'out');
  }
  if (req.query.category) {
    const categoryId = String(req.query.category);
    items = items.filter((i) => i.product?.categoryId === categoryId);
  }

  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'name';
  const sorters: Record<string, (a: InventoryView, b: InventoryView) => number> = {
    name: (a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? ''),
    stockAsc: (a, b) => a.quantityOnHand - b.quantityOnHand,
    stockDesc: (a, b) => b.quantityOnHand - a.quantityOnHand,
    status: (a, b) => {
      const order = { out: 0, low: 1, ok: 2 };
      return order[a.status] - order[b.status];
    },
  };
  items.sort(sorters[sort] ?? sorters.name);

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const data = items.slice(start, start + limit);

  const result: Paginated<InventoryView> = {
    data,
    page: safePage,
    limit,
    total,
    totalPages,
  };
  res.json(result);
});

inventoryRouter.get('/:id', (req: Request, res: Response) => {
  const item = store.getInventory(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Inventory item not found' });
    return;
  }
  res.json(toView(item, store.listProducts()));
});

function validateInventoryPatch(body: unknown): {
  error?: string;
  value?: InventoryPatch;
} {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const out: InventoryPatch = {};
  const errors: string[] = [];

  if (b.quantityOnHand !== undefined) {
    const q = Number(b.quantityOnHand);
    if (!Number.isFinite(q) || q < 0) errors.push('quantityOnHand must be a non-negative number');
    else out.quantityOnHand = Math.floor(q);
  }
  if (b.reorderLevel !== undefined) {
    const r = Number(b.reorderLevel);
    if (!Number.isFinite(r) || r < 0) errors.push('reorderLevel must be a non-negative number');
    else out.reorderLevel = Math.floor(r);
  }
  if (b.lowStockThreshold !== undefined) {
    const t = Number(b.lowStockThreshold);
    if (!Number.isFinite(t) || t < 0) errors.push('lowStockThreshold must be a non-negative number');
    else out.lowStockThreshold = Math.floor(t);
  }
  if (b.location !== undefined) {
    if (typeof b.location !== 'string') errors.push('location must be a string');
    else out.location = b.location;
  }

  if (errors.length) return { error: errors.join('; ') };
  if (Object.keys(out).length === 0) return { error: 'No valid fields to update' };
  return { value: out };
}

inventoryRouter.patch('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const existing = store.getInventory(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Inventory item not found' });
    return;
  }
  const { error, value } = validateInventoryPatch(req.body);
  if (error || !value) {
    res.status(400).json({ error });
    return;
  }
  const updated = store.updateInventory(existing.id, value);
  res.json(toView(updated!, store.listProducts()));
});
