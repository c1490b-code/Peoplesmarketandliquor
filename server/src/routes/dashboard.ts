import { Router, Request, Response } from 'express';
import { parsePositiveInt } from '../utils/pagination';
import type {
  DashboardPeriod,
  DashboardSummary,
  LowStockProduct,
  SalesDataPoint,
  TopProduct,
  TopProductSort,
} from '../types';
import { store } from '../data/store';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', (_req: Request, res: Response) => {
  const summary: DashboardSummary = store.dashboardSummary();
  res.json(summary);
});

dashboardRouter.get('/sales', (req: Request, res: Response) => {
  const period = parsePeriod(req.query.period, 'monthly');
  const limit = parsePositiveInt(req.query.limit, 30);
  const data: SalesDataPoint[] = store.salesSeries(period, limit);
  res.json(data);
});

dashboardRouter.get('/top-products', (req: Request, res: Response) => {
  const limit = parsePositiveInt(req.query.limit, 10);
  const sort = parseTopProductSort(req.query.sort, 'revenue');
  const data: TopProduct[] = store.topProducts({ limit, sort });
  res.json(data);
});

dashboardRouter.get('/low-stock', (_req: Request, res: Response) => {
  const data: LowStockProduct[] = store.lowStockProducts();
  res.json(data);
});

dashboardRouter.get('/recent-orders', (req: Request, res: Response) => {
  const limit = parsePositiveInt(req.query.limit, 10);
  res.json(store.recentOrders(limit));
});

function parsePeriod(value: unknown, fallback: DashboardPeriod): DashboardPeriod {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') {
    return value;
  }
  return fallback;
}

function parseTopProductSort(
  value: unknown,
  fallback: TopProductSort,
): TopProductSort {
  if (value === 'revenue' || value === 'quantity' || value === 'orders') {
    return value;
  }
  return fallback;
}
