# Peoples Market & Liquor — POS & Inventory

A full-stack Point of Sale and inventory management application for Peoples
Market & Liquor, built with **React + Vite + TypeScript + Tailwind CSS** on
the frontend and **Express + TypeScript** on the backend.

The app provides a complete point-of-sale workflow, product & inventory
tracking, customer management, and a reporting dashboard — all backed by a
lightweight JSON file store that ships with rich seed data so the application
is immediately useful on first run.

## Features

- **Point of Sale (POS)** — product grid with search/category filter, cart with
  quantity controls, percent/amount discounts, cash/card/other payment
  support, change calculation, receipt preview, and print support.
- **Product Management** — searchable, sortable, paginated catalog with
  category assignment, price/cost, unit, description, and low-stock indicators.
- **Inventory Tracking** — stock-level bars, low-stock badges and filters,
  per-item adjust-stock modal with reorder and threshold controls.
- **Customer Management** — searchable customer list, create/edit, per-customer
  detail view with order history.
- **Categories** — organize products into categories (Beer, Wine, Spirits,
  Grocery, Tobacco in the seed data).
- **Admin Dashboard** — KPI cards (total sales, orders, average order value,
  gross margin), a sales-over-time line chart (daily/weekly/monthly), top
  selling products (by revenue/quantity/orders), low-stock alerts, and a
  recent orders table.
- **Dark mode** — class-based dark theme with a header toggle, persisted in
  `localStorage` and respecting the system `prefers-color-scheme` on first
  visit.
- **Responsive UI** — mobile-friendly layouts (collapsible navigation, stacked
  controls, scrollable tables) for tablet and phone use.
- **Toast notifications** — non-blocking success/error/info/warning toasts for
  every create/update/delete action across the app.
- **Loading & error states** — consistent `LoadingState`, `EmptyState`, and
  `ErrorState` components on every page with retry support.
- **Seed data** — 5 categories, 34 products, 7 customers, and 25 historical
  orders spread over the last 30 days so the dashboard, POS, and reports
  light up immediately.

## Project Structure

```
/client                  React frontend (Vite + TypeScript + Tailwind CSS)
/client/src/pages        Route-level page components
/client/src/components   Reusable UI building blocks
/client/src/hooks        Custom React hooks
/server                  Express backend API (TypeScript)
/server/src/routes       REST route modules
/server/src/data         Store, seed module, and standalone seed script
```

## Getting Started

### Prerequisites

- Node.js **>= 20**

### Installation

```bash
npm install
```

This installs dependencies for the root, client, and server workspaces in one
step (the repo is configured as an npm workspace).

### Seed the demo data (optional but recommended)

The application auto-seeds the data store on first run, but you can
explicitly generate a fresh `data/db.json` at any time:

```bash
npm run seed --workspace=server
```

This writes 5 categories, 34 products, 7 customers, and 25 historical orders
to `server/data/db.json` (or the path in `$DATA_FILE` if set). Delete that
file to reset.

### Development

Run both the client and server concurrently:

```bash
npm run dev
```

- Client: <http://localhost:5173>
- Server: <http://localhost:4000>

The Vite dev server is configured to proxy `/api/*` requests to the Express
server so the frontend can call `/api/...` paths in both dev and production.

### Build

```bash
npm run build
```

Builds the client (`client/dist`) and compiles the server (`server/dist`).

### Start (production)

```bash
npm start
```

Runs the compiled Express server. The server only serves the JSON API; deploy
`client/dist` behind a reverse proxy or CDN to serve the frontend.

## Available Scripts

| Command                              | Description                                       |
| ------------------------------------ | ------------------------------------------------- |
| `npm run dev`                        | Run client and server in development mode         |
| `npm run build`                      | Build both client and server                      |
| `npm start`                          | Start the production server                       |
| `npm run lint`                       | Lint both client and server                       |
| `npm run type-check`                 | Type-check both client and server                 |
| `npm run seed --workspace=server`    | Write fresh demo seed data to the data store      |

## Environment Variables

| Variable      | Default                  | Description                                |
| ------------- | ------------------------ | ------------------------------------------ |
| `PORT`        | `4000`                   | Port the Express server listens on         |
| `DATA_FILE`   | `server/data/db.json`    | Path to the JSON data store                |
| `CORS_ORIGIN` | _all_                    | Override default CORS to a specific origin |

## Data Store

The API uses a lightweight JSON-file data store. On startup the server reads
`$DATA_FILE` (or `server/data/db.json` by default) and, if it does not exist,
seeds the file with the demo data set. All mutations are persisted back to
the same file.

## API Reference

### Products
- `GET /api/products` — list with optional `q` (search), `category`, `sort`
  (`name`, `sku`, `priceAsc`, `priceDesc`, `newest`), `page`, `limit`. Returns
  a paginated result with the product's category joined in.
- `GET /api/products/:id` — single product.
- `POST /api/products` — create product (fields: `name`, `sku`, `categoryId`,
  `price`, `cost`, `unit`, `description`). SKU must be unique.
- `PUT /api/products/:id` — update product.
- `DELETE /api/products/:id` — delete product and its inventory record.

### Inventory
- `GET /api/inventory` — list inventory joined with product data and a computed
  `status` (`out`, `low`, `ok`). Supports `lowStock=true`, `category`, `sort`
  (`name`, `stockAsc`, `stockDesc`, `status`), `page`, `limit`.
- `GET /api/inventory/:id` — single inventory item.
- `PATCH /api/inventory/:id` — update `quantityOnHand`, `reorderLevel`,
  `lowStockThreshold`, and/or `location`.

### Categories
- `GET /api/categories` — list all categories.
- `GET /api/categories/:id` — single category.
- `POST /api/categories` — create category (`name`, `description`).
- `PUT /api/categories/:id` — update category.
- `DELETE /api/categories/:id` — delete category (blocked if in use by
  products).

### Orders
- `GET /api/orders` — list orders (newest first) with optional `q` (order
  number or item name/SKU), `paymentMethod`, `customerId`, `page`, `limit`.
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
  - Inventory is decremented atomically on a successful sale. The response is
    the created `Order` with computed subtotal, discount, tax, total, and
    receipt fields.

### Customers
- `GET /api/customers` — paginated list with `q` (name/email/phone) and
  `sort` (`name`, `newest`, `oldest`).
- `GET /api/customers/:id` — single customer.
- `POST /api/customers` — create customer.
- `PUT /api/customers/:id` — update customer.
- `DELETE /api/customers/:id` — delete customer.
- `GET /api/customers/:id/orders` — list of orders placed by the customer,
  with `sort` (`newest`, `oldest`, `totalAsc`, `totalDesc`).

### Dashboard
- `GET /api/dashboard/summary` — KPI aggregates across completed orders:
  `totalSales`, `totalOrders`, `averageOrderValue`, `totalCost`,
  `totalProfit`, `grossMargin` (percentage).
- `GET /api/dashboard/sales?period=daily|weekly|monthly&limit=N` — time-series
  sales by period. `period` defaults to `monthly`; each data point has
  `period`, `orders`, `revenue`, `cost`, and `profit`. Most recent `limit`
  buckets are returned (default 30).
- `GET /api/dashboard/top-products?limit=N&sort=revenue|quantity|orders` — top
  selling products (by default, revenue) with units sold, revenue, cost,
  profit, and order counts, joined with product/category data.
- `GET /api/dashboard/low-stock` — products whose on-hand quantity is at or
  below the low-stock threshold, with `status` of `out` or `low`, sorted
  worst-first.
- `GET /api/dashboard/recent-orders?limit=N` — most recent orders (newest
  first), used for the dashboard's recent-orders table.

## Frontend Routes

- `/pos` — Point of Sale: product grid with search/category filter, cart
  sidebar with quantity controls and discount options (percent/amount), a
  payment modal supporting cash/card/other (with change calculation for
  cash), and an order confirmation + receipt preview with print support.
- `/products` — ProductsList: table view with search, category filter, sort,
  pagination, and low-stock indicators. Add/edit via a modal form.
- `/inventory` — Inventory tracking with stock-level bars, status badges,
  low-stock filter/alerts, and an adjust-stock modal.
- `/categories` — Category management (create, edit, delete).
- `/customers` — CustomersList with search/sort and add/edit/delete.
- `/customers/:id` — Customer detail with editable profile and order history.
- `/dashboard` — Admin dashboard: KPI cards, period selector driving a
  sales-over-time chart, top selling products, low-stock alerts, and recent
  orders.

## Notes

- The frontend uses a Tailwind class-based dark mode (`darkMode: 'class'`).
  The theme toggle in the header persists the choice in `localStorage` and an
  inline script in `index.html` sets the initial class before React mounts to
  prevent a flash of the wrong theme.
- The `useToast` hook provides a `success`/`error`/`info`/`warning` API. Toasts
  auto-dismiss after a few seconds but can also be closed manually.
- The standalone seed script (`npm run seed --workspace=server`) can be used
  to regenerate a fresh data file at any time, including in CI or for
  on-demand resets.
