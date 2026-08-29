import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { productsRouter } from './routes/products';
import { inventoryRouter } from './routes/inventory';
import { categoriesRouter } from './routes/categories';
import { ordersRouter } from './routes/orders';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Peoples Market & Liquor API' });
});

app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/orders', ordersRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
