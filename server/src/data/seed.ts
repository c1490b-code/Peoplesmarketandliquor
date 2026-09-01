import { randomUUID } from 'node:crypto';
import type {
  Category,
  Customer,
  Database,
  InventoryItem,
  Order,
  OrderItem,
  Product,
} from '../types';
import { DEFAULT_TAX_RATE } from './constants';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function now(): string {
  return new Date().toISOString();
}

export function seedCategory(
  name: string,
  description?: string,
): Category {
  const ts = now();
  return {
    id: randomUUID(),
    name,
    description: description ?? `${name} products`,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function seedCustomer(
  name: string,
  email: string,
  phone: string,
  address: string,
  notes: string,
): Customer {
  const ts = now();
  return {
    id: randomUUID(),
    name,
    email,
    phone,
    address,
    notes,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function buildSeedData(): Database {
  const categories: Category[] = [
    seedCategory('Beer', 'Domestic and imported beers, packs and singles'),
    seedCategory('Wine', 'Red, white, and sparkling wines'),
    seedCategory('Spirits', 'Whiskey, vodka, rum, gin, and tequila'),
    seedCategory('Grocery', 'Snacks, beverages, and household essentials'),
    seedCategory('Tobacco', 'Cigarettes and related products'),
  ];

  type ProductSeed = {
    name: string;
    sku: string;
    categoryId: string;
    price: number;
    cost: number;
    unit: string;
    description: string;
    quantityOnHand: number;
    reorderLevel: number;
    lowStockThreshold: number;
  };

  const catByName = new Map(categories.map((c) => [c.name, c.id]));

  const productSeeds: ProductSeed[] = [
    // Beer
    { name: 'Bud Light 12pk Cans', sku: 'BEER-BL-12', categoryId: catByName.get('Beer')!, price: 12.99, cost: 8.5, unit: 'case', description: 'Bud Light 12 pack cans', quantityOnHand: 42, reorderLevel: 20, lowStockThreshold: 10 },
    { name: 'Budweiser 6pk Bottles', sku: 'BEER-BW-06', categoryId: catByName.get('Beer')!, price: 8.49, cost: 5.4, unit: 'case', description: 'Budweiser 6 pack bottles', quantityOnHand: 28, reorderLevel: 18, lowStockThreshold: 9 },
    { name: 'Corona Extra 6pk', sku: 'BEER-CO-06', categoryId: catByName.get('Beer')!, price: 9.99, cost: 6.2, unit: 'case', description: 'Corona Extra 6 pack bottles', quantityOnHand: 4, reorderLevel: 15, lowStockThreshold: 8 },
    { name: 'Modelo Especial 12pk', sku: 'BEER-MO-12', categoryId: catByName.get('Beer')!, price: 14.49, cost: 9.1, unit: 'case', description: 'Modelo Especial 12 pack', quantityOnHand: 0, reorderLevel: 18, lowStockThreshold: 9 },
    { name: 'Heineken 6pk', sku: 'BEER-HE-06', categoryId: catByName.get('Beer')!, price: 10.99, cost: 6.8, unit: 'case', description: 'Heineken 6 pack bottles', quantityOnHand: 19, reorderLevel: 15, lowStockThreshold: 8 },
    { name: 'Coors Light 12pk', sku: 'BEER-CL-12', categoryId: catByName.get('Beer')!, price: 12.49, cost: 7.9, unit: 'case', description: 'Coors Light 12 pack cans', quantityOnHand: 31, reorderLevel: 20, lowStockThreshold: 10 },
    { name: 'Stella Artois 6pk', sku: 'BEER-SA-06', categoryId: catByName.get('Beer')!, price: 11.99, cost: 7.4, unit: 'case', description: 'Stella Artois 6 pack', quantityOnHand: 12, reorderLevel: 12, lowStockThreshold: 6 },
    { name: 'IPA Local Craft 6pk', sku: 'BEER-IPA-06', categoryId: catByName.get('Beer')!, price: 13.99, cost: 8.2, unit: 'case', description: 'Local craft IPA 6 pack', quantityOnHand: 8, reorderLevel: 10, lowStockThreshold: 5 },

    // Wine
    { name: 'Cabernet Sauvignon', sku: 'WINE-CAB-750', categoryId: catByName.get('Wine')!, price: 18.0, cost: 11.0, unit: 'bottle', description: 'California Cabernet 750ml', quantityOnHand: 26, reorderLevel: 12, lowStockThreshold: 6 },
    { name: 'Chardonnay', sku: 'WINE-CHD-750', categoryId: catByName.get('Wine')!, price: 15.5, cost: 9.5, unit: 'bottle', description: 'California Chardonnay 750ml', quantityOnHand: 13, reorderLevel: 12, lowStockThreshold: 6 },
    { name: 'Pinot Noir', sku: 'WINE-PN-750', categoryId: catByName.get('Wine')!, price: 19.5, cost: 12.0, unit: 'bottle', description: 'Oregon Pinot Noir 750ml', quantityOnHand: 18, reorderLevel: 10, lowStockThreshold: 5 },
    { name: 'Sauvignon Blanc', sku: 'WINE-SB-750', categoryId: catByName.get('Wine')!, price: 14.0, cost: 8.5, unit: 'bottle', description: 'New Zealand Sauvignon Blanc', quantityOnHand: 21, reorderLevel: 10, lowStockThreshold: 5 },
    { name: 'Prosecco', sku: 'WINE-PR-750', categoryId: catByName.get('Wine')!, price: 16.99, cost: 10.5, unit: 'bottle', description: 'Italian Prosecco sparkling', quantityOnHand: 15, reorderLevel: 10, lowStockThreshold: 5 },

    // Spirits
    { name: 'Jack Daniels Whiskey', sku: 'SPIRIT-JD-750', categoryId: catByName.get('Spirits')!, price: 29.99, cost: 19.0, unit: 'bottle', description: 'Jack Daniels Old No. 7 750ml', quantityOnHand: 31, reorderLevel: 10, lowStockThreshold: 5 },
    { name: "Tito's Vodka", sku: 'SPIRIT-TV-750', categoryId: catByName.get('Spirits')!, price: 24.99, cost: 15.5, unit: 'bottle', description: "Tito's Handmade Vodka 750ml", quantityOnHand: 7, reorderLevel: 10, lowStockThreshold: 5 },
    { name: 'Smirnoff Vodka', sku: 'SPIRIT-SM-750', categoryId: catByName.get('Spirits')!, price: 16.99, cost: 10.0, unit: 'bottle', description: 'Smirnoff No. 21 750ml', quantityOnHand: 22, reorderLevel: 10, lowStockThreshold: 5 },
    { name: 'Hennessy VS Cognac', sku: 'SPIRIT-HC-750', categoryId: catByName.get('Spirits')!, price: 49.99, cost: 32.0, unit: 'bottle', description: 'Hennessy Very Special 750ml', quantityOnHand: 9, reorderLevel: 8, lowStockThreshold: 4 },
    { name: 'Don Julio Blanco', sku: 'SPIRIT-DJ-750', categoryId: catByName.get('Spirits')!, price: 54.99, cost: 36.0, unit: 'bottle', description: 'Don Julio Blanco Tequila 750ml', quantityOnHand: 6, reorderLevel: 6, lowStockThreshold: 3 },
    { name: 'Captain Morgan Spiced Rum', sku: 'SPIRIT-CM-750', categoryId: catByName.get('Spirits')!, price: 19.99, cost: 12.5, unit: 'bottle', description: 'Captain Morgan Original Spiced 750ml', quantityOnHand: 14, reorderLevel: 8, lowStockThreshold: 4 },
    { name: 'Tanqueray Gin', sku: 'SPIRIT-TG-750', categoryId: catByName.get('Spirits')!, price: 27.99, cost: 17.5, unit: 'bottle', description: 'Tanqueray London Dry Gin 750ml', quantityOnHand: 11, reorderLevel: 8, lowStockThreshold: 4 },

    // Grocery
    { name: 'Coca-Cola 2L', sku: 'GROC-CC-2L', categoryId: catByName.get('Grocery')!, price: 2.49, cost: 1.1, unit: 'bottle', description: 'Coca-Cola 2 liter', quantityOnHand: 58, reorderLevel: 24, lowStockThreshold: 12 },
    { name: 'Pepsi 2L', sku: 'GROC-PP-2L', categoryId: catByName.get('Grocery')!, price: 2.49, cost: 1.1, unit: 'bottle', description: 'Pepsi 2 liter', quantityOnHand: 44, reorderLevel: 24, lowStockThreshold: 12 },
    { name: 'Bottled Water 24pk', sku: 'GROC-BW-24', categoryId: catByName.get('Grocery')!, price: 4.99, cost: 2.5, unit: 'case', description: 'Spring water 24 pack', quantityOnHand: 33, reorderLevel: 20, lowStockThreshold: 10 },
    { name: 'Red Bull 4pk', sku: 'GROC-RB-04', categoryId: catByName.get('Grocery')!, price: 7.99, cost: 4.8, unit: 'case', description: 'Red Bull Energy 4 pack', quantityOnHand: 24, reorderLevel: 12, lowStockThreshold: 6 },
    { name: 'Gatorade Lemon-Lime 32oz', sku: 'GROC-GL-32', categoryId: catByName.get('Grocery')!, price: 2.99, cost: 1.4, unit: 'bottle', description: 'Gatorade sports drink 32oz', quantityOnHand: 27, reorderLevel: 15, lowStockThreshold: 8 },
    { name: "Lay's Potato Chips", sku: 'SNACK-LC-01', categoryId: catByName.get('Grocery')!, price: 3.29, cost: 1.5, unit: 'bag', description: 'Classic potato chips', quantityOnHand: 9, reorderLevel: 15, lowStockThreshold: 8 },
    { name: 'Doritos Nacho Cheese', sku: 'SNACK-DC-01', categoryId: catByName.get('Grocery')!, price: 3.49, cost: 1.6, unit: 'bag', description: 'Doritos nacho cheese chips', quantityOnHand: 16, reorderLevel: 15, lowStockThreshold: 8 },
    { name: 'Beef Jerky Original', sku: 'SNACK-BJ-01', categoryId: catByName.get('Grocery')!, price: 5.99, cost: 3.0, unit: 'pack', description: 'Original beef jerky', quantityOnHand: 17, reorderLevel: 10, lowStockThreshold: 5 },
    { name: 'Snickers Bar', sku: 'SNACK-SN-01', categoryId: catByName.get('Grocery')!, price: 1.49, cost: 0.7, unit: 'bar', description: 'Snickers chocolate bar', quantityOnHand: 48, reorderLevel: 25, lowStockThreshold: 12 },
    { name: 'Ice Bag 10lb', sku: 'GROC-IC-10', categoryId: catByName.get('Grocery')!, price: 2.99, cost: 0.9, unit: 'bag', description: 'Cubed ice 10 pound bag', quantityOnHand: 35, reorderLevel: 20, lowStockThreshold: 10 },

    // Tobacco
    { name: 'Marlboro Reds', sku: 'TOB-MR-01', categoryId: catByName.get('Tobacco')!, price: 9.5, cost: 6.0, unit: 'pack', description: 'Marlboro Red cigarettes', quantityOnHand: 3, reorderLevel: 20, lowStockThreshold: 10 },
    { name: 'Marlboro Gold', sku: 'TOB-MG-01', categoryId: catByName.get('Tobacco')!, price: 9.5, cost: 6.0, unit: 'pack', description: 'Marlboro Gold cigarettes', quantityOnHand: 18, reorderLevel: 20, lowStockThreshold: 10 },
    { name: 'Newport Menthol', sku: 'TOB-NM-01', categoryId: catByName.get('Tobacco')!, price: 9.5, cost: 6.0, unit: 'pack', description: 'Newport Menthol cigarettes', quantityOnHand: 21, reorderLevel: 20, lowStockThreshold: 10 },
    { name: 'Camel Filters', sku: 'TOB-CF-01', categoryId: catByName.get('Tobacco')!, price: 9.0, cost: 5.7, unit: 'pack', description: 'Camel Filter cigarettes', quantityOnHand: 15, reorderLevel: 15, lowStockThreshold: 8 },
  ];

  const products: Product[] = [];
  const inventory: InventoryItem[] = [];
  const ts = now();

  for (const seed of productSeeds) {
    const {
      quantityOnHand,
      reorderLevel,
      lowStockThreshold,
      ...productFields
    } = seed;
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

  const customers: Customer[] = [
    seedCustomer('John Smith', 'john@example.com', '555-0101', '123 Main St, Springfield', 'Regular customer; prefers Bud Light'),
    seedCustomer('Jane Doe', 'jane@example.com', '555-0102', '456 Oak Ave, Springfield', 'VIP — offers wholesale pricing'),
    seedCustomer('Bob Johnson', 'bob@example.com', '555-0103', '789 Pine Rd, Shelbyville', 'Wholesale account, monthly billing'),
    seedCustomer('Maria Garcia', 'maria@example.com', '555-0104', '321 Elm St, Springfield', 'Birthday club member'),
    seedCustomer('David Lee', 'david@example.com', '555-0105', '654 Maple Dr, Capital City', 'Likes red wine'),
    seedCustomer('Sarah Williams', 'sarah@example.com', '555-0106', '987 Birch Ln, Springfield', 'New customer'),
    seedCustomer('Michael Brown', 'michael@example.com', '555-0107', '147 Cedar Ct, Ogdenville', 'Office party organizer'),
  ];

  // Build historical orders spread over the past 30 days.
  const orders: Order[] = [];
  const paymentMethods: Array<'cash' | 'card' | 'other'> = ['cash', 'card', 'card', 'card', 'other'];
  const startMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 25; i++) {
    const orderTs = new Date(startMs + Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString();
    const date = orderTs.slice(0, 10).replace(/-/g, '');
    const itemCount = 1 + Math.floor(Math.random() * 4);
    const orderItems: OrderItem[] = [];
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    for (let j = 0; j < itemCount && j < shuffled.length; j++) {
      const p = shuffled[j];
      const qty = 1 + Math.floor(Math.random() * 3);
      orderItems.push({
        id: randomUUID(),
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        quantity: qty,
        unitPrice: p.price,
        cost: p.cost,
        lineTotal: round2(p.price * qty),
      });
    }
    const subtotal = round2(orderItems.reduce((s, it) => s + it.lineTotal, 0));
    const taxRate = DEFAULT_TAX_RATE;
    const discountTotal = 0;
    const taxable = round2(subtotal - discountTotal);
    const taxTotal = round2(taxable * taxRate);
    const total = round2(taxable + taxTotal);
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const amountTendered = paymentMethod === 'cash' ? round2(total + Math.random() * 20) : null;
    const changeDue = amountTendered !== null ? round2(amountTendered - total) : null;
    const customer = customers[Math.floor(Math.random() * customers.length)];
    orders.push({
      id: randomUUID(),
      orderNumber: `PML-${date}-${String(i + 1).padStart(4, '0')}`,
      customerId: customer.id,
      cashierId: null,
      items: orderItems,
      subtotal,
      discountType: 'none',
      discountValue: 0,
      discountTotal,
      taxRate,
      taxTotal,
      total,
      paymentMethod,
      amountTendered,
      changeDue,
      status: 'completed',
      createdAt: orderTs,
      updatedAt: orderTs,
    });
  }

  return { categories, products, inventory, customers, orders };
}
