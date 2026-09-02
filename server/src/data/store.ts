import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  Category,
  InventoryItem,
  Product,
  ProductInput,
  User,
  UserInput,
  UserRole,
} from '../types';

interface Database {
  categories: Category[];
  products: Product[];
  inventory: InventoryItem[];
  users: User[];
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

  return { categories, products, inventory, users: [] };
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

class Store {
  private db: Database;

  constructor() {
    this.db = this.load();
  }

  load(): Database {
    try {
      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<Database>;
        return {
          categories: parsed.categories ?? [],
          products: parsed.products ?? [],
          inventory: parsed.inventory ?? [],
          users: parsed.users ?? [],
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

  // ----- Users -----
  listUsers(): Omit<User, 'passwordHash'>[] {
    return this.db.users.map((u) => {
      const { passwordHash: _ph, ...rest } = u;
      return rest;
    });
  }

  getUserByEmail(email: string): (User & { passwordHash: string }) | undefined {
    return this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): Omit<User, 'passwordHash'> | undefined {
    const user = this.db.users.find((u) => u.id === id);
    if (!user) return undefined;
    const { passwordHash: _ph, ...rest } = user;
    return rest;
  }

  createUser(input: UserInput, passwordHash: string): Omit<User, 'passwordHash'> {
    return this.createUserInternal(input.email, input.name, input.role ?? 'cashier', passwordHash);
  }

  private createUserInternal(email: string, name: string, role: UserRole, passwordHash: string): Omit<User, 'passwordHash'> {
    const ts = now();
    const user: User = {
      id: randomUUID(),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      passwordHash,
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.users.push(user);
    this.persist();
    const { passwordHash: _ph, ...rest } = user;
    return rest;
  }

  updateUserPassword(id: string, passwordHash: string): void {
    const user = this.db.users.find((u) => u.id === id);
    if (!user) return;
    user.passwordHash = passwordHash;
    user.updatedAt = now();
    this.persist();
  }

  ensureUser(email: string, name: string, role: UserRole, passwordHash: string): Omit<User, 'passwordHash'> {
    const existing = this.getUserByEmail(email);
    if (existing) {
      this.updateUserPassword(existing.id, passwordHash);
      const { passwordHash: _ph, ...rest } = existing;
      return rest;
    }
    return this.createUserInternal(email, name, role, passwordHash);
  }
}

export const store = new Store();
