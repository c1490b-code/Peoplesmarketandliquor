import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { Store, getStore, setStore } from '../data/store';
import { ordersRouter } from '../routes/orders';
import { randomUUID } from 'node:crypto';

function makeStore(): Store {
  const s = new Store();
  s.resetForTest();
  return s;
}

function createOrdersApp(store: Store) {
  const original = getStore();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  setStore(store);
  return {
    app,
    restore: () => setStore(original),
  };
}

describe('GET /api/orders', () => {
  it('returns empty list when no orders', async () => {
    const store = makeStore();
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    } finally {
      restore();
    }
  });

  it('returns paginated orders', async () => {
    const store = makeStore();
    const product = store.listProducts()[0];
    store.createOrder({
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'cash',
      amountTendered: 100,
    });
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBe(1);
    } finally {
      restore();
    }
  });

  it('filters by paymentMethod', async () => {
    const store = makeStore();
    const product = store.listProducts()[0];
    store.createOrder({
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'cash',
      amountTendered: 100,
    });
    store.createOrder({
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'card',
    });
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app).get('/api/orders?paymentMethod=cash');
      expect(res.status).toBe(200);
      expect(res.body.data.every((o: { paymentMethod: string }) => o.paymentMethod === 'cash')).toBe(true);
    } finally {
      restore();
    }
  });
});

describe('GET /api/orders/:id', () => {
  it('returns 404 for unknown id', async () => {
    const store = makeStore();
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app).get(`/api/orders/${randomUUID()}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Order not found');
    } finally {
      restore();
    }
  });

  it('returns order by id', async () => {
    const store = makeStore();
    const product = store.listProducts()[0];
    const order = store.createOrder({
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'cash',
      amountTendered: 100,
    }).order!;
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app).get(`/api/orders/${order.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(order.id);
      expect(res.body.orderNumber).toBe(order.orderNumber);
    } finally {
      restore();
    }
  });
});

describe('POST /api/orders', () => {
  it('creates an order with cash payment', async () => {
    const store = makeStore();
    const product = store.listProducts()[0];
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: product.id, quantity: 1 }],
          paymentMethod: 'cash',
          amountTendered: 100,
        });
      expect(res.status).toBe(201);
      expect(res.body.orderNumber).toBeDefined();
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.paymentMethod).toBe('cash');
      expect(res.body.amountTendered).toBe(100);
    } finally {
      restore();
    }
  });

  it('returns 400 for empty items', async () => {
    const store = makeStore();
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [],
          paymentMethod: 'cash',
          amountTendered: 100,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('items must be a non-empty array');
    } finally {
      restore();
    }
  });

  it('returns 409 for insufficient stock', async () => {
    const store = makeStore();
    const product = store.listProducts()[0];
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: product.id, quantity: 99999 }],
          paymentMethod: 'card',
        });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Insufficient stock');
    } finally {
      restore();
    }
  });

  it('returns 400 for percent discount > 100', async () => {
    const store = makeStore();
    const product = store.listProducts()[0];
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: product.id, quantity: 1 }],
          discountType: 'percent',
          discountValue: 150,
          paymentMethod: 'card',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('discountValue must be between 0 and 100');
    } finally {
      restore();
    }
  });

  it('decrements inventory on successful order', async () => {
    const store = makeStore();
    const product = store.listProducts()[0];
    const inv = store.getInventoryByProduct(product.id)!;
    const before = inv.quantityOnHand;
    const { app, restore } = createOrdersApp(store);
    try {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId: product.id, quantity: 2 }],
          paymentMethod: 'cash',
          amountTendered: 100,
        });
      expect(res.status).toBe(201);
      const updated = store.getInventoryByProduct(product.id)!;
      expect(updated.quantityOnHand).toBe(before - 2);
    } finally {
      restore();
    }
  });
});
