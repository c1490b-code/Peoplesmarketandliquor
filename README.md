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

## Frontend

- `/products` — ProductsList: table view with search, category filter, sort,
  pagination, and low-stock indicators. Add/edit via a modal form.
- `/inventory` — Inventory tracking with stock-level bars, status badges,
  low-stock filter/alerts, and an adjust-stock modal.
- `/categories` — Category management (create, edit, delete).

