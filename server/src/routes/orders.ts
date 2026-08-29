import { Router, Request, Response } from 'express';
import { store, DEFAULT_TAX_RATE } from '../data/store';
import { parsePositiveInt } from '../utils/pagination';
import type {
  CreateOrderInput,
  CreateOrderItemInput,
  DiscountType,
  Order,
  Paginated,
  PaymentMethod,
} from '../types';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'other'];
const DISCOUNT_TYPES: DiscountType[] = ['none', 'percent', 'amount'];

export const ordersRouter = Router();

ordersRouter.get('/', (req: Request, res: Response) => {
  let orders = store
    .listOrders()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const q = req.query.q.trim().toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.items.some(
          (i) =>
            i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
        ),
    );
  }
  if (typeof req.query.paymentMethod === 'string' && req.query.paymentMethod) {
    orders = orders.filter((o) => o.paymentMethod === req.query.paymentMethod);
  }
  if (typeof req.query.customerId === 'string' && req.query.customerId) {
    orders = orders.filter((o) => o.customerId === req.query.customerId);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10);
  const total = orders.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  const result: Paginated<Order> = {
    data: orders.slice(start, start + limit),
    page: safePage,
    limit,
    total,
    totalPages,
  };
  res.json(result);
});

ordersRouter.get('/:id', (req: Request, res: Response) => {
  const order = store.getOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(order);
});

function validateOrderBody(body: unknown): {
  error?: string;
  value?: CreateOrderInput;
} {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  const items: CreateOrderItemInput[] = [];
  if (!Array.isArray(b.items) || b.items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    b.items.forEach((raw, idx) => {
      if (typeof raw !== 'object' || raw === null) {
        errors.push(`items[${idx}] must be an object`);
        return;
      }
      const line = raw as Record<string, unknown>;
      const productId =
        typeof line.productId === 'string' ? line.productId.trim() : '';
      const quantity = Number(line.quantity);
      if (!productId) errors.push(`items[${idx}].productId is required`);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`items[${idx}].quantity must be a positive number`);
        return;
      }
      if (productId) {
        items.push({ productId, quantity: Math.floor(quantity) });
      }
    });
  }

  const paymentMethod = b.paymentMethod as PaymentMethod;
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    errors.push(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }

  let discountType: DiscountType = 'none';
  if (b.discountType !== undefined) {
    if (!DISCOUNT_TYPES.includes(b.discountType as DiscountType)) {
      errors.push(`discountType must be one of: ${DISCOUNT_TYPES.join(', ')}`);
    } else {
      discountType = b.discountType as DiscountType;
    }
  }

  let discountValue = 0;
  if (b.discountValue !== undefined) {
    const v = Number(b.discountValue);
    if (!Number.isFinite(v) || v < 0) {
      errors.push('discountValue must be a non-negative number');
    } else if (discountType === 'percent' && v > 100) {
      errors.push('discountValue must be between 0 and 100 for percent discounts');
    } else {
      discountValue = v;
    }
  }

  let taxRate = DEFAULT_TAX_RATE;
  if (b.taxRate !== undefined) {
    const t = Number(b.taxRate);
    if (!Number.isFinite(t) || t < 0 || t > 1) {
      errors.push('taxRate must be a number between 0 and 1');
    } else {
      taxRate = t;
    }
  }

  let amountTendered: number | null = null;
  if (b.amountTendered !== undefined && b.amountTendered !== null) {
    const a = Number(b.amountTendered);
    if (!Number.isFinite(a) || a < 0) {
      errors.push('amountTendered must be a non-negative number');
    } else {
      amountTendered = a;
    }
  }

  const customerId =
    typeof b.customerId === 'string' && b.customerId ? b.customerId : null;
  const cashierId =
    typeof b.cashierId === 'string' && b.cashierId ? b.cashierId : null;

  if (errors.length) return { error: errors.join('; ') };

  return {
    value: {
      items,
      customerId,
      cashierId,
      discountType,
      discountValue,
      taxRate,
      paymentMethod,
      amountTendered,
    },
  };
}

ordersRouter.post('/', (req: Request, res: Response) => {
  const { error, value } = validateOrderBody(req.body);
  if (error || !value) {
    res.status(400).json({ error });
    return;
  }
  const result = store.createOrder(value);
  if (result.error || !result.order) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }
  res.status(201).json(result.order);
});
