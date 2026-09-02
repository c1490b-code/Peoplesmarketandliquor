import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  Category,
  CreateOrderInput,
  Customer,
  CustomerInput,
  Database,
  DashboardPeriod,
  DashboardSummary,
  InventoryItem,
  LowStockProduct,
  Order,
  OrderItem,
  Product,
  ProductInput,
  SalesDataPoint,
  TopProduct,
  TopProductSort,
} from '../types';
import { DEFAULT_TAX_RATE } from './constants';
import { buildSeedData } from './seed';

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

const DATA_FILE = process.env.DATA_FILE || 'data/db.json';

function now(): string {
  return new Date().toISOString();
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function bucketKey(date: Date, period: DashboardPeriod): string {
  if (period === 'daily') return formatDate(date);
  if (period === 'monthly') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return formatDate(startOfWeek(date));
}

function orderCost(order: Order): number {
  return order.items.reduce((sum, i) => sum + i.cost * i.quantity, 0);
}

class Store {
  private db: Database;

  constructor() {
    this.db = this.load();
  }

  private load(): Database {
    try {
      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<Database>;
        return {
          categories: parsed.categories ?? [],
          products: parsed.products ?? [],
          inventory: parsed.inventory ?? [],
          customers: parsed.customers ?? [],
          orders: parsed.orders ?? [],
        };
      }
    } catch {
      // fall through to seed
    }
    const seeded = buildSeedData();
    this.persist(seeded);
    return seeded;
  }

  private persist(db: Database = this.db): void {
    const dir = dirname(DATA_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  }

  // ----- Categories -----
  listCategories(): Category[] {
    return [...this.db.categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  getCategory(id: string): Category | undefined {
    return this.db.categories.find((c) => c.id === id);
  }

  createCategory(input: { name: string; description?: string }): Category {
    const ts = now();
    const category: Category = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? '',
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.categories.push(category);
    this.persist();
    return category;
  }

  updateCategory(
    id: string,
    input: { name?: string; description?: string },
  ): Category | undefined {
    const category = this.getCategory(id);
    if (!category) return undefined;
    if (input.name !== undefined) category.name = input.name;
    if (input.description !== undefined) category.description = input.description;
    category.updatedAt = now();
    this.persist();
    return category;
  }

  deleteCategory(id: string): boolean {
    const idx = this.db.categories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.db.categories.splice(idx, 1);
    this.persist();
    return true;
  }

  // ----- Products -----
  listProducts(): Product[] {
    return [...this.db.products];
  }

  getProduct(id: string): Product | undefined {
    return this.db.products.find((p) => p.id === id);
  }

  getProductBySku(sku: string): Product | undefined {
    return this.db.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
  }

  createProduct(input: ProductInput): Product {
    const ts = now();
    const product: Product = {
      id: randomUUID(),
      createdAt: ts,
      updatedAt: ts,
      ...input,
    };
    this.db.products.push(product);
    const inv: InventoryItem = {
      id: randomUUID(),
      productId: product.id,
      quantityOnHand: 0,
      reorderLevel: 0,
      lowStockThreshold: 0,
      location: '',
      lastRestockedAt: null,
      updatedAt: ts,
    };
    this.db.inventory.push(inv);
    this.persist();
    return product;
  }

  updateProduct(id: string, input: Partial<ProductInput>): Product | undefined {
    const product = this.getProduct(id);
    if (!product) return undefined;
    Object.assign(product, input);
    product.updatedAt = now();
    this.persist();
    return product;
  }

  deleteProduct(id: string): boolean {
    const idx = this.db.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.db.products.splice(idx, 1);
    const invIdx = this.db.inventory.findIndex((i) => i.productId === id);
    if (invIdx !== -1) this.db.inventory.splice(invIdx, 1);
    this.persist();
    return true;
  }

  // ----- Inventory -----
  listInventory(): InventoryItem[] {
    return [...this.db.inventory];
  }

  getInventory(id: string): InventoryItem | undefined {
    return this.db.inventory.find((i) => i.id === id);
  }

  getInventoryByProduct(productId: string): InventoryItem | undefined {
    return this.db.inventory.find((i) => i.productId === productId);
  }

  updateInventory(
    id: string,
    patch: Partial<
      Pick<
        InventoryItem,
        'quantityOnHand' | 'reorderLevel' | 'lowStockThreshold' | 'location'
      >
    >,
  ): InventoryItem | undefined {
    const item = this.getInventory(id);
    if (!item) return undefined;
    if (patch.quantityOnHand !== undefined) {
      item.quantityOnHand = Math.max(0, patch.quantityOnHand);
      if (patch.quantityOnHand > item.quantityOnHand) {
        item.lastRestockedAt = now();
      }
    }
    if (patch.reorderLevel !== undefined) item.reorderLevel = patch.reorderLevel;
    if (patch.lowStockThreshold !== undefined)
      item.lowStockThreshold = patch.lowStockThreshold;
    if (patch.location !== undefined) item.location = patch.location;
    item.updatedAt = now();
    this.persist();
    return item;
  }

  // ----- Customers -----
  listCustomers(): Customer[] {
    return [...this.db.customers];
  }

  getCustomer(id: string): Customer | undefined {
    return this.db.customers.find((c) => c.id === id);
  }

  createCustomer(input: CustomerInput): Customer {
    const ts = now();
    const customer: Customer = {
      id: randomUUID(),
      createdAt: ts,
      updatedAt: ts,
      ...input,
    };
    this.db.customers.push(customer);
    this.persist();
    return customer;
  }

  updateCustomer(
    id: string,
    input: Partial<CustomerInput>,
  ): Customer | undefined {
    const customer = this.getCustomer(id);
    if (!customer) return undefined;
    Object.assign(customer, input);
    customer.updatedAt = now();
    this.persist();
    return customer;
  }

  deleteCustomer(id: string): boolean {
    const idx = this.db.customers.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.db.customers.splice(idx, 1);
    this.persist();
    return true;
  }

  // ----- Orders -----
  listOrders(): Order[] {
    return [...this.db.orders];
  }

  getOrder(id: string): Order | undefined {
    return this.db.orders.find((o) => o.id === id);
  }

  getOrdersByCustomer(customerId: string): Order[] {
    return this.db.orders.filter((o) => o.customerId === customerId);
  }

  private nextOrderNumber(): string {
    const seq = this.db.orders.length + 1;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PML-${date}-${String(seq).padStart(4, '0')}`;
  }

  createOrder(
    input: CreateOrderInput,
  ): { order?: Order; error?: string; status?: number } {
    if (!input.items.length) {
      return { error: 'An order must contain at least one item', status: 400 };
    }

    const merged = new Map<string, number>();
    for (const line of input.items) {
      merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
    }

    const items: OrderItem[] = [];
    const decrements: Array<{ item: InventoryItem; quantity: number }> = [];

    for (const [productId, quantity] of merged) {
      const product = this.getProduct(productId);
      if (!product) {
        return { error: `Product ${productId} not found`, status: 404 };
      }
      const inv = this.getInventoryByProduct(productId);
      const onHand = inv?.quantityOnHand ?? 0;
      if (onHand < quantity) {
        return {
          error: `Insufficient stock for "${product.name}": ${onHand} on hand, ${quantity} requested`,
          status: 409,
        };
      }
      if (inv) decrements.push({ item: inv, quantity });
      items.push({
        id: randomUUID(),
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity,
        unitPrice: product.price,
        cost: product.cost,
        lineTotal: round2(product.price * quantity),
      });
    }

    const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));

    const discountType = input.discountType ?? 'none';
    const discountValue = input.discountValue ?? 0;
    let discountTotal = 0;
    if (discountType === 'percent') {
      discountTotal = round2(subtotal * (discountValue / 100));
    } else if (discountType === 'amount') {
      discountTotal = round2(discountValue);
    }
    discountTotal = Math.min(Math.max(discountTotal, 0), subtotal);

    const taxRate = input.taxRate ?? DEFAULT_TAX_RATE;
    const taxable = round2(subtotal - discountTotal);
    const taxTotal = round2(taxable * taxRate);
    const total = round2(taxable + taxTotal);

    const amountTendered =
      input.amountTendered === undefined || input.amountTendered === null
        ? null
        : round2(input.amountTendered);

    if (input.paymentMethod === 'cash') {
      if (amountTendered === null) {
        return { error: 'amountTendered is required for cash payments', status: 400 };
      }
      if (amountTendered < total) {
        return {
          error: `Amount tendered (${amountTendered.toFixed(2)}) is less than the order total (${total.toFixed(2)})`,
          status: 400,
        };
      }
    }

    const changeDue =
      input.paymentMethod === 'cash' && amountTendered !== null
        ? round2(amountTendered - total)
        : null;

    const ts = now();
    const order: Order = {
      id: randomUUID(),
      orderNumber: this.nextOrderNumber(),
      customerId: input.customerId ?? null,
      cashierId: input.cashierId ?? null,
      items,
      subtotal,
      discountType,
      discountValue,
      discountTotal,
      taxRate,
      taxTotal,
      total,
      paymentMethod: input.paymentMethod,
      amountTendered,
      changeDue,
      status: 'completed',
      createdAt: ts,
      updatedAt: ts,
    };

    for (const { item, quantity } of decrements) {
      item.quantityOnHand = Math.max(0, item.quantityOnHand - quantity);
      item.updatedAt = ts;
    }

    this.db.orders.push(order);
    this.persist();
    return { order };
  }

  // ----- Dashboard -----
  private completedOrders(): Order[] {
    return this.db.orders.filter((o) => o.status === 'completed');
  }

  dashboardSummary(): DashboardSummary {
    const orders = this.completedOrders();
    const totalOrders = orders.length;
    const totalSales = round2(orders.reduce((sum, o) => sum + o.total, 0));
    const totalCost = round2(orders.reduce((sum, o) => sum + orderCost(o), 0));
    const totalProfit = round2(totalSales - totalCost);
    const averageOrderValue = totalOrders ? round2(totalSales / totalOrders) : 0;
    const grossMargin = totalSales
      ? round2((totalProfit / totalSales) * 100)
      : 0;
    return {
      period: 'all',
      totalSales,
      totalOrders,
      averageOrderValue,
      totalCost,
      totalProfit,
      grossMargin,
    };
  }

  salesSeries(
    period: DashboardPeriod,
    limit: number = 30,
  ): SalesDataPoint[] {
    const orders = this.completedOrders();
    const groups = new Map<
      string,
      { orders: number; revenue: number; cost: number }
    >();

    for (const order of orders) {
      const key = bucketKey(new Date(order.createdAt), period);
      const g = groups.get(key) ?? { orders: 0, revenue: 0, cost: 0 };
      g.orders++;
      g.revenue += order.total;
      g.cost += orderCost(order);
      groups.set(key, g);
    }

    const data: SalesDataPoint[] = [];
    for (const [key, g] of groups) {
      data.push({
        period: key,
        orders: g.orders,
        revenue: round2(g.revenue),
        cost: round2(g.cost),
        profit: round2(g.revenue - g.cost),
      });
    }
    data.sort((a, b) => a.period.localeCompare(b.period));
    if (limit > 0) {
      return data.slice(-limit);
    }
    return data;
  }

  topProducts(options: {
    limit?: number;
    sort?: TopProductSort;
  } = {}): TopProduct[] {
    const orders = this.completedOrders();
    const products = this.db.products;
    const categories = this.db.categories;
    const agg = new Map<
      string,
      { quantity: number; revenue: number; cost: number; orders: number }
    >();

    for (const order of orders) {
      const seen = new Set<string>();
      for (const item of order.items) {
        const a = agg.get(item.productId) ?? {
          quantity: 0,
          revenue: 0,
          cost: 0,
          orders: 0,
        };
        a.quantity += item.quantity;
        a.revenue += item.lineTotal;
        a.cost += item.cost * item.quantity;
        agg.set(item.productId, a);
        seen.add(item.productId);
      }
      seen.forEach((pid) => {
        agg.get(pid)!.orders++;
      });
    }

    const sorters: Record<TopProductSort, (a: TopProduct, b: TopProduct) => number> = {
      revenue: (a, b) => b.revenue - a.revenue,
      quantity: (a, b) => b.quantitySold - a.quantitySold,
      orders: (a, b) => b.orders - a.orders,
    };

    const result: TopProduct[] = [];
    for (const [productId, a] of agg) {
      const product = products.find((p) => p.id === productId);
      if (!product) continue;
      const category = product.categoryId
        ? categories.find((c) => c.id === product.categoryId) ?? null
        : null;
      result.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        price: product.price,
        cost: product.cost,
        quantitySold: a.quantity,
        revenue: round2(a.revenue),
        costTotal: round2(a.cost),
        profit: round2(a.revenue - a.cost),
        orders: a.orders,
        categoryId: product.categoryId,
        category,
      });
    }

    result.sort(sorters[options.sort ?? 'revenue']);
    const limit = options.limit ?? 10;
    return limit > 0 ? result.slice(0, limit) : result;
  }

  lowStockProducts(): LowStockProduct[] {
    const products = this.db.products;
    const categories = this.db.categories;
    const result: LowStockProduct[] = [];

    for (const item of this.db.inventory) {
      let status: 'out' | 'low' | 'ok' = 'ok';
      if (item.quantityOnHand <= 0) status = 'out';
      else if (item.quantityOnHand <= item.lowStockThreshold) status = 'low';
      if (status === 'ok') continue;

      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const category = product.categoryId
        ? categories.find((c) => c.id === product.categoryId) ?? null
        : null;
      result.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        price: product.price,
        categoryId: product.categoryId,
        category,
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        lowStockThreshold: item.lowStockThreshold,
        status,
      });
    }

    result.sort((a, b) => a.quantityOnHand - b.quantityOnHand);
    return result;
  }

  recentOrders(limit: number = 10): Order[] {
    return [...this.db.orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

export const store = new Store();
export { DEFAULT_TAX_RATE };
