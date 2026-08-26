# Peoples Market & Liquor

Full-stack application with Express.js backend and React frontend.

## Features

- User authentication with JWT tokens and bcrypt password hashing
- Role-based access control (admin, cashier)
- Protected routes and API endpoints

## Prerequisites

- Node.js 18+
- npm

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and set `JWT_SECRET` to a secure random string
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | Randomly generated (set in production) |
| `PORT` | Server port | `5000` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

## Scripts

- `npm run dev` - Start both server and client in development mode
- `npm run server` - Start only the server
- `npm run client` - Start only the client
- `npm start` - Start the server in production mode
- `npm run build` - Build the client for production

## Demo Accounts

- Admin: `admin@market.com` / `admin123`
- Cashier: `cashier@market.com` / `cashier123`

## API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user info
- `GET /api/health` - Health check
