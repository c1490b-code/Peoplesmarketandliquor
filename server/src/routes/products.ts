import { Router, Request, Response } from 'express';
import { store } from '../data/store';
import type {
  Category,
  Paginated,
  Product,
  ProductWithCategory,
} from '../types';

function withCategory(
  product: Product,
  categories: Category[],
): ProductWithCategory {
  return {
    ...product,
    category: product.categoryId
      ? categories.find((c) => c.id === product.categoryId) ?? null
      : null,
  };
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const productsRouter = Router();

productsRouter.get('/', (req: Request, res: Response) => {
  const categories = store.listCategories();
  let products = store.listProducts().map((p) => withCategory(p, categories));

  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const categoryId = typeof req.query.category === 'string' ? req.query.category : '';
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'name';

  if (q) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    );
  }
  if (categoryId) {
    products = products.filter((p) => p.categoryId === categoryId);
  }

  const sorters: Record<string, (a: ProductWithCategory, b: ProductWithCategory) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    sku: (a, b) => a.sku.localeCompare(b.sku),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  products.sort(sorters[sort] ?? sorters.name);

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10);
  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const data = products.slice(start, start + limit);

  const result: Paginated<ProductWithCategory> = {
    data,
    page: safePage,
    limit,
    total,
    totalPages,
  };
  res.json(result);
});

productsRouter.get('/:id', (req: Request, res: Response) => {
  const product = store.getProduct(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(withCategory(product, store.listCategories()));
});

function validateProductBody(body: unknown): { error?: string; value?: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const sku = typeof b.sku === 'string' ? b.sku.trim() : '';
  const price = typeof b.price === 'number' ? b.price : Number(b.price);
  const cost = typeof b.cost === 'number' ? b.cost : Number(b.cost);
  const categoryId = b.categoryId === null || b.categoryId === undefined ? null : String(b.categoryId);
  const unit = typeof b.unit === 'string' ? b.unit : 'each';
  const description = typeof b.description === 'string' ? b.description : '';
  const errors: string[] = [];
  if (!name) errors.push('name is required');
  if (!sku) errors.push('sku is required');
  if (!Number.isFinite(price) || price < 0) errors.push('price must be a non-negative number');
  if (!Number.isFinite(cost) || cost < 0) errors.push('cost must be a non-negative number');
  if (categoryId) {
    const cat = store.getCategory(categoryId);
    if (!cat) errors.push('categoryId does not reference an existing category');
  }
  if (errors.length) return { error: errors.join('; ') };
  return {
    value: {
      name,
      sku,
      price: Number(price.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      categoryId,
      unit,
      description,
    },
  };
}

productsRouter.post('/', (req: Request, res: Response) => {
  const { error, value } = validateProductBody(req.body);
  if (error || !value) {
    res.status(400).json({ error });
    return;
  }
  if (store.getProductBySku(value.sku)) {
    res.status(409).json({ error: `A product with SKU "${value.sku}" already exists` });
    return;
  }
  const product = store.createProduct(value);
  res.status(201).json(withCategory(product, store.listCategories()));
});

productsRouter.put('/:id', (req: Request, res: Response) => {
  const existing = store.getProduct(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const { error, value } = validateProductBody(req.body);
  if (error || !value) {
    res.status(400).json({ error });
    return;
  }
  const dup = store.getProductBySku(value.sku);
  if (dup && dup.id !== existing.id) {
    res.status(409).json({ error: `A product with SKU "${value.sku}" already exists` });
    return;
  }
  const updated = store.updateProduct(existing.id, value);
  res.json(withCategory(updated!, store.listCategories()));
});

productsRouter.delete('/:id', (req: Request, res: Response) => {
  const ok = store.deleteProduct(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.status(204).end();
});
