import { Router, Request, Response } from 'express';
import { store } from '../data/store';
import { parsePositiveInt } from '../utils/pagination';
import type {
  Customer,
  CustomerInput,
  Order,
  Paginated,
} from '../types';

export const customersRouter = Router();

function validateCustomerBody(
  body: unknown,
): { error?: string; value?: CustomerInput } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
  const address = typeof b.address === 'string' ? b.address.trim() : '';
  const notes = typeof b.notes === 'string' ? b.notes.trim() : '';
  const errors: string[] = [];
  if (!name) errors.push('name is required');
  if (!email) errors.push('email is required');
  if (errors.length) return { error: errors.join('; ') };
  return {
    value: {
      name,
      email,
      phone,
      address,
      notes,
    },
  };
}

customersRouter.get('/', (req: Request, res: Response) => {
  let customers = store.listCustomers();

  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  if (q) {
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }

  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'name';
  const sorters: Record<string, (a: Customer, b: Customer) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  };
  customers.sort(sorters[sort] ?? sorters.name);

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10);
  const total = customers.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const data = customers.slice(start, start + limit);

  const result: Paginated<Customer> = {
    data,
    page: safePage,
    limit,
    total,
    totalPages,
  };
  res.json(result);
});

customersRouter.get('/:id', (req: Request, res: Response) => {
  const customer = store.getCustomer(req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json(customer);
});

customersRouter.post('/', (req: Request, res: Response) => {
  const { error, value } = validateCustomerBody(req.body);
  if (error || !value) {
    res.status(400).json({ error });
    return;
  }
  const customer = store.createCustomer(value);
  res.status(201).json(customer);
});

customersRouter.put('/:id', (req: Request, res: Response) => {
  const existing = store.getCustomer(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  const { error, value } = validateCustomerBody(req.body);
  if (error || !value) {
    res.status(400).json({ error });
    return;
  }
  const updated = store.updateCustomer(existing.id, value);
  res.json(updated!);
});

customersRouter.delete('/:id', (req: Request, res: Response) => {
  const ok = store.deleteCustomer(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.status(204).end();
});

customersRouter.get('/:id/orders', (req: Request, res: Response) => {
  const customer = store.getCustomer(req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  let orders = store.getOrdersByCustomer(req.params.id);

  const status = typeof req.query.status === 'string' ? req.query.status : '';
  if (status) {
    orders = orders.filter((o) => o.status === status);
  }

  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
  const sorters: Record<string, (a: Order, b: Order) => number> = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    totalAsc: (a, b) => a.total - b.total,
    totalDesc: (a, b) => b.total - a.total,
  };
  orders.sort(sorters[sort] ?? sorters.newest);

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10);
  const total = orders.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const data = orders.slice(start, start + limit);

  const result: Paginated<Order> = {
    data,
    page: safePage,
    limit,
    total,
    totalPages,
  };
  res.json(result);
});
