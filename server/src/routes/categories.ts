import { Router, Request, Response } from 'express';
import { store } from '../data/store';

export const categoriesRouter = Router();

categoriesRouter.get('/', (_req: Request, res: Response) => {
  res.json(store.listCategories());
});

categoriesRouter.get('/:id', (req: Request, res: Response) => {
  const category = store.getCategory(req.params.id);
  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.json(category);
});

function validateCategoryBody(body: unknown): {
  error?: string;
  value?: { name: string; description: string };
} {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const description = typeof b.description === 'string' ? b.description : '';
  if (!name) return { error: 'name is required' };
  return { value: { name, description } };
}

categoriesRouter.post('/', (req: Request, res: Response) => {
  const { error, value } = validateCategoryBody(req.body);
  if (error || !value) {
    res.status(400).json({ error });
    return;
  }
  const existing = store
    .listCategories()
    .find((c) => c.name.toLowerCase() === value.name.toLowerCase());
  if (existing) {
    res.status(409).json({ error: `Category "${value.name}" already exists` });
    return;
  }
  const category = store.createCategory(value);
  res.status(201).json(category);
});

categoriesRouter.put('/:id', (req: Request, res: Response) => {
  const existing = store.getCategory(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  const { error, value } = validateCategoryBody(req.body);
  if (error || !value) {
    res.status(400).json({ error });
    return;
  }
  const dup = store
    .listCategories()
    .find((c) => c.name.toLowerCase() === value.name.toLowerCase() && c.id !== existing.id);
  if (dup) {
    res.status(409).json({ error: `Category "${value.name}" already exists` });
    return;
  }
  const updated = store.updateCategory(existing.id, value);
  res.json(updated);
});

categoriesRouter.delete('/:id', (req: Request, res: Response) => {
  const inUse = store
    .listProducts()
    .some((p) => p.categoryId === req.params.id);
  if (inUse) {
    res.status(409).json({ error: 'Cannot delete category that is assigned to products' });
    return;
  }
  const ok = store.deleteCategory(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.status(204).end();
});
