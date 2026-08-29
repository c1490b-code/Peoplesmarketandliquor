import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  Category,
  CreateOrderInput,
  InventoryItem,
  Order,
  OrderItem,
  Product,
  ProductInput,
} from '../types';

const DEFAULT_TAX_RATE = 0.0825;

interface Database {
  categories: Category[];
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
}

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

const DATA_FILE = process.env.DATA_FILE || 'data/db.json';

function now(): string {
  return new Date().toISOString();
}

function seed(): Database {
  const categories: Category[] = [
    seedCategory('Beer'),
    seedCategory('Wine'),
    seedCategory('Spirits'),
    seedCategory('Grocery'),
    seedCategory('Snacks'),
    seedCategory('Tobacco'),
  ];

  const rawProducts: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & {
    quantityOnHand: number;
    reorderLevel: number;
    lowStockThreshold: number;
  }> = [
    { name: 'Bud Light 12pk', sku: 'BEER-BL-12', categoryId: categories[0].id, price: 12.99, cost: 8.5, unit: 'case', description: 'Bud Light 12 pack cans', quantityOnHand: 42, reorderLevel: 20, lowStockThreshold: 10 },
    { name: 'Corona Extra 6pk', sku: 'BEER-CO-06', categoryId: categories[0].id, price: 9.99, cost: 6.2, unit: 'case', description: 'Corona Extra 6 pack bottles', quantityOnHand: 4, reorderLevel: 15, lowStockThreshold: 8 },
    { name: 'Modelo Especial 12pk', sku: 'BEER-MO-12', categoryId: categories[0].id, price: 14.49, cost: 9.1, unit: 'case', description: 'Modelo Especial 12 pack', quantityOnHand: 0, reorderLevel: 18, lowStockThreshold: 9 },
    { name: 'Cabernet Sauvignon', sku: 'WINE-CAB-750', categoryId: categories[1].id, price: 18.0, cost: 11.0, unit: 'bottle', description: 'California Cabernet 750ml', quantityOnHand: 26, reorderLevel: 12, lowStockThreshold: 6 },
    { name: 'Chardonnay', sku: 'WINE-CHD-750', categoryId: categories[1].id, price: 15.5, cost: 9.5, unit: 'bottle', description: 'California Chardonnay 750ml', quantityOnHand: 13, reorderLevel: 12, lowStockThreshold: 6 },
    { name: 'Jack Daniels Whiskey', sku: 'SPIRIT-JD-750', categoryId: categories[2].id, price: 29.99, cost: 19.0, unit: 'bottle', description: 'Jack Daniels Old No. 7 750ml', quantityOnHand: 31, reorderLevel: 10, lowStockThreshold: 5 },
    { name: "Tito's Vodka", sku: 'SPIRIT-TV-750', categoryId: categories[2].id, price: 24.99, cost: 15.5, unit: 'bottle', description: "Tito's Handmade Vodka 750ml", quantityOnHand: 7, reorderLevel: 10, lowStockThreshold: 5 },
    { name: 'Smirnoff Vodka', sku: 'SPIRIT-SM-750', categoryId: categories[2].id, price: 16.99, cost: 10.0, unit: 'bottle', description: 'Smirnoff No. 21 750ml', quantityOnHand: 22, reorderLevel: 10, lowStockThreshold: 5 },
    { name: 'Coca-Cola 2L', sku: 'GROC-CC-2L', categoryId: categories[3].id, price: 2.49, cost: 1.1, unit: 'bottle', description: 'Coca-Cola 2 liter', quantityOnHand: 58, reorderLevel: 24, lowStockThreshold: 12 },
    { name: 'Bottled Water 24pk', sku: 'GROC-BW-24', categoryId: categories[3].id, price: 4.99, cost: 2.5, unit: 'case', description: 'Spring water 24 pack', quantityOnHand: 33, reorderLevel: 20, lowStockThreshold: 10 },
    { name: "Lay's Potato Chips", sku: 'SNACK-LC-01', categoryId: categories[4].id, price: 3.29, cost: 1.5, unit: 'bag', description: 'Classic potato chips', quantityOnHand: 9, reorderLevel: 15, lowStockThreshold: 8 },
    { name: 'Beef Jerky', sku: 'SNACK-BJ-01', categoryId: categories[4].id, price: 5.99, cost: 3.0, unit: 'pack', description: 'Original beef jerky', quantityOnHand: 17, reorderLevel: 10, lowStockThreshold: 5 },
    { name: 'Marlboro Reds', sku: 'TOB-MR-01', categoryId: categories[5].id, price: 9.5, cost: 6.0, unit: 'pack', description: 'Marlboro Red cigarettes', quantityOnHand: 3, reorderLevel: 20, lowStockThreshold: 10 },
    { name: 'Newport Menthol', sku: 'TOB-NM-01', categoryId: categories[5].id, price: 9.5, cost: 6.0, unit: 'pack', description: 'Newport Menthol cigarettes', quantityOnHand: 21, reorderLevel: 20, lowStockThreshold: 10 },
  ];

  const products: Product[] = [];
  const inventory: InventoryItem[] = [];
  const ts = now();

  for (const raw of rawProducts) {
    const { quantityOnHand, reorderLevel, lowStockThreshold, ...productFields } =
      raw;
    const product: Product = {
      id: randomUUID(),
      createdAt: ts,
      updatedAt: ts,
      ...productFields,
    };
    products.push(product);
    inventory.push({
      id: randomUUID(),
      productId: product.id,
      quantityOnHand,
      reorderLevel,
      lowStockThreshold,
      location: 'Main Floor',
      lastRestockedAt: ts,
      updatedAt: ts,
    });
  }

  return { categories, products, inventory, orders: [] };
}

function seedCategory(name: string): Category {
  const ts = now();
  return {
    id: randomUUID(),
    name,
    description: `${name} products`,
    createdAt: ts,
    updatedAt: ts,
  };
}

export class Store {
  private db: Database;
  private orderCounter: number;

  constructor() {
    this.db = this.load();
    this.orderCounter = this.db.orders.length;
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
          orders: parsed.orders ?? [],
        };
      }
    } catch {
      // fall through to seed
    }
    const seeded = seed();
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

  // ----- Orders -----
  listOrders(): Order[] {
    return [...this.db.orders];
  }

  getOrder(id: string): Order | undefined {
    return this.db.orders.find((o) => o.id === id);
  }

  resetForTest(): void {
    this.db.orders = [];
    this.orderCounter = 0;
    this.persist();
  }

  nextOrderNumber(): string {
    this.orderCounter += 1;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PML-${date}-${String(this.orderCounter).padStart(4, '0')}`;
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
      createdAt: ts,
    };

    for (const { item, quantity } of decrements) {
      item.quantityOnHand = Math.max(0, item.quantityOnHand - quantity);
      item.updatedAt = ts;
    }

    this.db.orders.push(order);
    this.persist();
    return { order };
  }
}

let store = new Store();
export { store };

export function getStore(): Store {
  return store;
}

export function setStore(next: Store): void {
  store = next;
}
export { DEFAULT_TAX_RATE };
