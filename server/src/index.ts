import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { productsRouter } from './routes/products';
import { inventoryRouter } from './routes/inventory';
import { categoriesRouter } from './routes/categories';
import { authRouter } from './routes/auth';
import { store } from './data/store';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

async function seedDemoUsers() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const cashierHash = await bcrypt.hash('cashier123', 10);
  store.ensureUser('admin@market.com', 'Admin User', 'admin', adminHash);
  store.ensureUser('cashier@market.com', 'Cashier User', 'cashier', cashierHash);
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Peoples Market & Liquor API' });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/categories', categoriesRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

store.load();

seedDemoUsers().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
