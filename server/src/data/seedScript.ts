import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildSeedData } from './seed';

const DATA_FILE = process.env.DATA_FILE
  ? resolve(process.env.DATA_FILE)
  : resolve(process.cwd(), 'data/db.json');

const db = buildSeedData();
mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');

const summary = {
  file: DATA_FILE,
  categories: db.categories.length,
  products: db.products.length,
  inventory: db.inventory.length,
  customers: db.customers.length,
  orders: db.orders.length,
};

console.log('Seeded data written to', summary.file);
console.log(JSON.stringify(summary, null, 2));
