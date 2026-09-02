import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
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

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

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

export const ready: Promise<void> = (async () => {
  store.load();
  if (process.env.NODE_ENV !== 'production') {
    await seedDemoUsers();
  }
})();

ready.then(() => {
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
});

export { app };

export async function seedDemoUsers() {
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'admin123';
  const cashierPassword = process.env.DEMO_CASHIER_PASSWORD || 'cashier123';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const cashierHash = await bcrypt.hash(cashierPassword, 10);
  store.ensureUser('admin@market.com', 'Admin User', 'admin', adminHash);
  store.ensureUser('cashier@market.com', 'Cashier User', 'cashier', cashierHash);
}
