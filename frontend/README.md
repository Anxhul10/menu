# Menu Frontend

This Vite React application consumes the existing Express API. It does not access PostgreSQL or Supabase directly, and the backend remains authoritative for authentication, ownership, menu availability, prices, and order totals.

## Setup

```sh
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the backend API base URL, for example `http://localhost:3000/api`. Optionally set `VITE_SOCKET_URL` to `http://localhost:3000`; otherwise the socket URL is derived from the API URL. Configure the matching browser origin in the backend `CORS_ORIGINS` variable. Do not put database credentials, JWT signing secrets, or other privileged values in this file.

## Commands

```sh
npm run dev
npm run build
npm test
```

## Routes

- `/` is the customer-first entry page. `/admin` is the separate owner entry page, with `/admin/login`, `/admin/signup`, and protected `/admin/dashboard` routes.
- `/login` and `/register` use `POST /api/auth/login` and `POST /api/auth/register`.
- `/app` loads `GET /api/auth/me` and `GET /api/restaurants`.
- Restaurant dashboard pages use the authenticated restaurant, menu, table, and order management endpoints under `/api/restaurants/:restaurantId`.
- `/r/:slug/menu` uses `GET /api/public/restaurants/:slug/menu`.
- `/r/:slug/t/:qrToken` resolves the QR token with `GET /api/public/tables/:qrToken` and loads the public menu.
- `/cart` creates cash orders with `POST /api/public/orders`.
- `/order/:trackingToken` polls `GET /api/public/orders/:trackingToken`.

The QR image and public URL are returned by the backend table QR endpoint; the frontend does not construct privileged URLs or expose internal IDs as authorization credentials.

The manual table code is the QR token itself: a secure 32–100 character URL-safe token. Scanned URLs must match the expected `/r/:restaurantSlug/t/:qrToken` pattern and an allowed public origin. Camera permission is requested only after selecting **Scan QR Code**; denied or unsupported cameras fall back to manual code entry.

## Local integration

Start the backend from the repository root in one terminal and the frontend in another:

```sh
# repository root
npm run dev

# frontend/
npm run dev
```

The backend must have `CORS_ORIGINS=http://localhost:5173` (or the actual Vite origin). Live database persistence requires the backend Supabase environment variables and migrations to be configured first. Socket.IO notifications are best-effort; HTTP remains authoritative and polling recovers missed updates. UPI is intentionally deferred.

Owner order pages authenticate the socket with the current JWT and emit `restaurant:subscribe`. Customer tracking pages emit `order:subscribe` with their tracking token. The frontend cleans up socket listeners when pages or restaurants change, refetches through HTTP after reconnecting, and keeps polling as a recovery fallback.
