# Peoples Market & Liquor POS

A full-stack Point of Sale application for Peoples Market & Liquor, built with React (Vite + TypeScript) on the frontend and Express on the backend.

## Project Structure

```
/client  - React frontend (Vite + TypeScript + Tailwind CSS)
/server  - Express backend API (TypeScript)
```

## Getting Started

### Prerequisites

- Node.js >= 20

### Installation

```bash
npm install
```

### Development

Run both the client and server concurrently:

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000

### Build

Build both the client and server for production:

```bash
npm run build
```

### Start

Start the production server:

```bash
npm start
```

## Available Scripts

| Command                    | Description                                  |
| -------------------------- | -------------------------------------------- |
| `npm run dev`              | Run client and server in development mode      |
| `npm run build`            | Build both client and server                  |
| `npm start`                | Start the production server                   |
| `npm run lint`             | Lint both client and server                   |
| `npm run type-check`       | Type-check both client and server             |

## Data Store

The API uses a lightweight JSON-file data store (seeded on first run). Data is
persisted to `server/src/data/db.json` (git-ignored). Override the path with the
`DATA_FILE` environment variable.

## API Reference

### Products
- `GET /api/products` — list with optional `q` (search), `category`, `sort`
  (`name`, `sku`, `priceAsc`, `priceDesc`, `newest`), `page`, `limit`. Returns a
  paginated result with the product's category joined in.
- `GET /api/products/:id` — single product
- `POST /api/products` — create product (fields: `name`, `sku`, `categoryId`,
  `price`, `cost`, `unit`, `description`). SKU must be unique.
- `PUT /api/products/:id` — update product
- `DELETE /api/products/:id` — delete product and its inventory record

### Inventory
- `GET /api/inventory` — list inventory joined with product data and a computed
  `status` (`out`, `low`, `ok`). Supports `lowStock=true`, `category`, `sort`
  (`name`, `stockAsc`, `stockDesc`, `status`), `page`, `limit`.
- `GET /api/inventory/:id` — single inventory item
- `PATCH /api/inventory/:id` — update `quantityOnHand`, `reorderLevel`,
  `lowStockThreshold`, and/or `location`.

### Categories
- `GET /api/categories` — list all categories
- `GET /api/categories/:id` — single category
- `POST /api/categories` — create category (`name`, `description`)
- `PUT /api/categories/:id` — update category
- `DELETE /api/categories/:id` — delete category (blocked if in use by products)

### Orders
- `GET /api/orders` — list orders (newest first) with optional `q` (order number
  or item name/SKU), `paymentMethod`, `customerId`, `page`, `limit`.
- `GET /api/orders/:id` — single order (used for receipt retrieval).
- `POST /api/orders` — create an order. Body:
  - `items` (required): array of `{ productId, quantity }`. Quantities must be
    positive integers; insufficient stock returns `409`.
  - `paymentMethod` (required): `cash`, `card`, or `other`.
  - `discountType` (optional): `none` (default), `percent`, or `amount`.
  - `discountValue` (optional): number (percent 0–100, or dollar amount).
  - `taxRate` (optional): fraction 0–1, defaults to `0.0825` (8.25%).
  - `customerId` / `cashierId` (optional): linked customer / cashier.
  - `amountTendered` (optional, required for `cash`): amount received; must be ≥
    the order total, otherwise `400`. Generates `changeDue`.
  - Inventory is decremented atomically on a successful sale. The response is the
    created `Order` with computed subtotal, discount, tax, total, and receipt
    fields.

### Dashboard
- `GET /api/dashboard/summary` — KPI aggregates across completed orders:
  `totalSales`, `totalOrders`, `averageOrderValue`, `totalCost`, `totalProfit`,
  `grossMargin` (percentage).
- `GET /api/dashboard/sales?period=daily|weekly|monthly&limit=N` — time-series
  sales by period. `period` defaults to `monthly`; each data point has
  `period`, `orders`, `revenue`, `cost`, and `profit`. Most recent `limit`
  buckets are returned (default 30).
- `GET /api/dashboard/top-products?limit=N&sort=revenue|quantity|orders` — top
  selling products (by default, revenue) with units sold, revenue, cost, profit,
  and order counts, joined with product/category data.
- `GET /api/dashboard/low-stock` — products whose on-hand quantity is at or below
  the low-stock threshold, with `status` of `out` or `low`, sorted worst-first.
- `GET /api/dashboard/recent-orders?limit=N` — most recent orders (newest first),
  used for the dashboard's recent-orders table.

### Frontend

- `/pos` — Point of Sale: product grid with search/category filter, cart sidebar
  with quantity controls and discount options (percent/amount), a payment modal
  supporting cash/card/other (with change calculation for cash), and an order
  confirmation + receipt preview with print support.
- `/products` — ProductsList: table view with search, category filter, sort,
  pagination, and low-stock indicators. Add/edit via a modal form.
- `/inventory` — Inventory tracking with stock-level bars, status badges,
  low-stock filter/alerts, and an adjust-stock modal.
- `/categories` — Category management (create, edit, delete).
- `/dashboard` — Admin dashboard: KPI cards (total sales, orders, average order
  value, gross margin), a period selector driving a sales-over-time chart, top
  selling products, low-stock alerts, and a recent orders table.

