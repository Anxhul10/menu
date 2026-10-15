# Menu

**Menu** is a QR-based restaurant ordering app. Customers scan a table
QR code to browse the menu and place orders, while restaurant owners
manage restaurants, menus, tables, and orders from a dashboard.

## Features

-   Owner registration and login
-   Manage multiple restaurants
-   Create menu categories and items
-   Manage tables and generate QR codes
-   Let customers browse menus and order without signing in
-   Keep additional orders in the same active table session
-   Track order status and preparation time
-   Record cash payments
-   Receive live order updates with Socket.IO

## Tech stack

-   React and Vite
-   Node.js and Express
-   PostgreSQL with Supabase
-   Prisma ORM
-   Socket.IO

## Requirements

-   Node.js 20 or newer
-   A Supabase PostgreSQL database

## Run locally

### 1. Configure the backend

Copy the example environment file:

``` sh
cp .env.example .env
```

Set these values in `.env`:

``` dotenv
DATABASE_URL="your-supabase-pooled-connection-string"
DIRECT_URL="your-supabase-direct-connection-string"
JWT_SECRET="your-long-random-secret"
CORS_ORIGINS="http://localhost:5173"
PUBLIC_APP_URL="http://localhost:5173"
```

Use the connection strings from **Supabase → Project Settings →
Database**. Keep `.env` private and never commit database credentials or
secrets.

### 2. Install dependencies and prepare the database

From the repository root:

``` sh
npm install
npm run prisma:generate
npx prisma migrate deploy
```

For a brand-new development database with no migrations created yet,
create the initial migration with:

``` sh
npx prisma migrate dev --name init
```

Do not use `prisma migrate dev` against production.

### 3. Start the backend

``` sh
npm run dev
```

The backend runs at `http://localhost:3000`. Check its health endpoint:

``` sh
curl http://localhost:3000/api/health
```

### 4. Start the frontend

In a second terminal:

``` sh
cd frontend
npm install
cp .env.example .env
```

Set the frontend variables in `frontend/.env`:

``` dotenv
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_PUBLIC_APP_ORIGIN=http://localhost:5173
```

Then run:

``` sh
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Production environment

Configure environment variables in your hosting provider rather than
committing them to Git.

For the deployed frontend, set:

``` dotenv
VITE_API_BASE_URL=https://YOUR-BACKEND-DOMAIN/api
VITE_SOCKET_URL=https://YOUR-BACKEND-DOMAIN
VITE_PUBLIC_APP_ORIGIN=https://YOUR-FRONTEND-DOMAIN
```

On the backend, set the production database connection strings, a strong
`JWT_SECRET`, `CORS_ORIGINS` to your frontend origin, and
`PUBLIC_APP_URL` to the public frontend URL. After changing Vite
environment variables, rebuild or redeploy the frontend.

## Main routes

-   `/` --- Customer landing page and QR ordering entry
-   `/r/:restaurantSlug/t/:qrToken` --- Customer menu for a table
-   `/admin/login` --- Owner login
-   `/admin/signup` --- Owner registration
-   `/admin/dashboard` --- Owner dashboard

## API overview

Most owner endpoints require:

``` http
Authorization: Bearer <token>
```

Main API groups:

-   `/api/auth` --- Register, login, and current user
-   `/api/restaurants` --- Restaurant management
-   `/api/restaurants/:restaurantId/categories` --- Menu categories
-   `/api/restaurants/:restaurantId/items` --- Menu items
-   `/api/restaurants/:restaurantId/tables` --- Tables and QR codes
-   `/api/restaurants/:restaurantId/orders` --- Owner order management
-   `/api/public/restaurants/:slug/menu` --- Public menu
-   `/api/public/tables/:qrToken` --- Resolve a table QR code
-   `/api/public/orders` --- Place a customer order
-   `/api/public/orders/:trackingToken` --- Track an order
-   `/api/health` --- Health check

## Tests and build

Backend tests:

``` sh
npm test
```

Frontend build and tests:

``` sh
cd frontend
npm run build
npm test
```

Backend tests use mocked repositories; they do not verify connectivity
to the live Supabase database. Test production database connectivity
separately before launch.

## Order flow

1.  An owner creates a restaurant, menu, and tables.
2.  The owner generates and prints each table's QR code.
3.  A customer scans the QR code and places an order.
4.  The owner updates the order status and preparation estimate.
5.  The owner records cash collection when payment is received.

The backend validates restaurant ownership, item availability, prices,
order totals, and allowed order-status transitions.
