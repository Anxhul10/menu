# Menu backend

Phase 7 provides restaurant operations for guest cash orders: filtered/paginated order queues, guarded lifecycle transitions, estimated preparation times, and explicit cash collection. Order lines snapshot item names and prices, and cash orders remain unpaid until collection is recorded.

## Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. In the Supabase dashboard, open **Project Settings → Database** and copy the pooler connection string into `DATABASE_URL`. Copy the direct connection string into `DIRECT_URL`. Replace the placeholders with the project reference, region, and database password; do not commit `.env`.
4. Install dependencies and generate the Prisma client:

   ```sh
   npm install
   npm run prisma:generate
   ```

   Set `JWT_SECRET` to a long random value. `JWT_EXPIRES_IN` defaults to `1h`.

5. Run the initial migration workflow after the Supabase values are configured:

   ```sh
   npx prisma migrate dev --name init
   ```

   This applies the User, Restaurant, MenuCategory, MenuItem, and RestaurantTable tables. For an existing database, apply all committed migrations with:

   ```sh
   npx prisma migrate deploy
   ```

   Both commands require a reachable Supabase database. Never point test commands at production data.

## Run

```sh
npm run dev
```

The API is available at `http://localhost:3000`. Check it with `curl http://localhost:3000/api/health`.

## Authentication API

Registration creates a user and their first restaurant. Email addresses are normalized to lowercase, passwords are bcrypt-hashed, and the response contains a signed access token.

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "password": "correct-horse-battery",
  "restaurantName": "Asha's Kitchen",
  "restaurantSlug": "ashas-kitchen"
}
```

Login uses the same `email` and `password` fields:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "asha@example.com",
  "password": "correct-horse-battery"
}
```

Both successful requests return a body shaped like:

```json
{
  "user": {
    "id": "user-uuid",
    "name": "Asha Rao",
    "email": "asha@example.com",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  },
  "restaurants": [
    {
      "id": "restaurant-uuid",
      "name": "Asha's Kitchen",
      "slug": "ashas-kitchen",
      "ownerId": "user-uuid",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "token": "signed-jwt"
}
```

Use the token to call the protected profile endpoint:

```http
GET /api/auth/me
Authorization: Bearer signed-jwt
```

The profile query uses the user ID from the verified token and loads only that user's restaurants. Client-supplied restaurant IDs are not used as authorization evidence. Future staff access can be added with a restaurant membership model and role field.

## Restaurant management API

All restaurant endpoints require `Authorization: Bearer <token>` from registration or login. Restaurant ownership is always derived from the verified token; a request-body `ownerId` is ignored.

- `POST /api/restaurants` creates a restaurant. Required: `name` (2–120 characters). Optional: `description` and `address` (strings up to 500 characters). The slug is generated from the name and receives a numeric suffix when needed.
- `GET /api/restaurants` lists active restaurants owned by the authenticated user.
- `GET /api/restaurants/:id` returns an owned active restaurant. Missing or unauthorized IDs return the same `404 Restaurant not found` response.
- `PATCH /api/restaurants/:id` updates `name`, `description`, and/or `address`. At least one permitted field is required. The existing slug is preserved when the name changes so public links do not unexpectedly break.
- `DELETE /api/restaurants/:id` archives the restaurant by setting `isActive` to `false`; it does not delete rows or cascade into future historical records.

Create example:

```http
POST /api/restaurants
Authorization: Bearer signed-jwt
Content-Type: application/json

{
  "name": "Asha's Kitchen",
  "description": "Seasonal Indian food",
  "address": "1 Market Street"
}
```

Successful responses wrap the resource:

```json
{
  "restaurant": {
    "id": "restaurant-uuid",
    "name": "Asha's Kitchen",
    "slug": "ashas-kitchen",
    "description": "Seasonal Indian food",
    "address": "1 Market Street",
    "isActive": true,
    "ownerId": "user-uuid",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Common errors use the existing JSON shape: `401` for missing or invalid authentication, `400` for invalid input, `404` for missing or unauthorized restaurants, `409` for a database uniqueness conflict, and `500` for unexpected server errors.

## Tests

## Menu API

Management endpoints require `Authorization: Bearer <token>` and verify that the token owner owns `:restaurantId`.

Categories:

- `POST /api/restaurants/:restaurantId/categories` creates a category. `name` is required and must be 1–100 characters; `description` is optional and capped at 500 characters; `sortOrder` is an optional non-negative integer.
- `GET /api/restaurants/:restaurantId/categories` lists categories by `sortOrder`, then creation time.
- `PATCH /api/restaurants/:restaurantId/categories/:categoryId` updates `name`, `description`, or `sortOrder`.
- `DELETE /api/restaurants/:restaurantId/categories/:categoryId` returns `409` while menu items remain assigned; empty categories return `204`.

Items:

- `POST /api/restaurants/:restaurantId/items` creates an item with required `categoryId`, `name`, and non-negative string `price`.
- `GET /api/restaurants/:restaurantId/items` lists all management items, including unavailable items.
- `GET /api/restaurants/:restaurantId/items/:itemId` retrieves one item.
- `PATCH /api/restaurants/:restaurantId/items/:itemId` updates permitted fields: `categoryId`, `name`, `description`, `price`, `imageUrl`, and `isAvailable`.
- `PATCH /api/restaurants/:restaurantId/items/:itemId/availability` changes only `isAvailable`.
- `DELETE /api/restaurants/:restaurantId/items/:itemId` deletes an item and returns `204`; future historical-order relationships will require an archival strategy.

Prices must be strings with at most two decimal places, such as `"12"`, `"12.5"`, or `"12.50"`. Values are stored as `DECIMAL(10,2)` and returned consistently as strings such as `"12.50"`. JavaScript floating-point values, negative values, and malformed amounts are rejected.

Example item request:

```http
POST /api/restaurants/restaurant-uuid/items
Authorization: Bearer signed-jwt
Content-Type: application/json

{
  "categoryId": "category-uuid",
  "name": "Paneer Tikka",
  "description": "Char-grilled paneer",
  "price": "12.50",
  "imageUrl": "https://example.com/paneer.jpg"
}
```

Example response:

```json
{
  "item": {
    "id": "item-uuid",
    "restaurantId": "restaurant-uuid",
    "categoryId": "category-uuid",
    "name": "Paneer Tikka",
    "description": "Char-grilled paneer",
    "price": "12.50",
    "imageUrl": "https://example.com/paneer.jpg",
    "isAvailable": true
  }
}
```

The public endpoint requires no authentication:

```http
GET /api/public/restaurants/ashas-kitchen/menu
```

It returns only active restaurants, categories, and available items. It excludes owner IDs and other management-only fields. Missing or inactive restaurants return `404`.

## Table and QR API

Table management requires `Authorization: Bearer <token>` and verifies ownership of `:restaurantId`.

- `POST /api/restaurants/:restaurantId/tables` creates a table. `tableNumber` is required, stored as a trimmed label, and must be 1–50 characters. The server generates a cryptographically random `qrToken`; clients cannot provide one.
- `GET /api/restaurants/:restaurantId/tables` lists tables owned by the authenticated user.
- `GET /api/restaurants/:restaurantId/tables/:tableId` retrieves one owned table.
- `PATCH /api/restaurants/:restaurantId/tables/:tableId` updates only `tableNumber`.
- `PATCH /api/restaurants/:restaurantId/tables/:tableId/availability` accepts `{ "isActive": false }` or `{ "isActive": true }`. Inactive tables remain stored for future historical order relationships.
- `GET /api/restaurants/:restaurantId/tables/:tableId/qr` returns a printable PNG data URL and its customer-facing URL.

The QR URL uses the configured `PUBLIC_APP_URL` and has this shape:

```text
${PUBLIC_APP_URL}/r/:restaurantSlug/t/:qrToken
```

For example, with `PUBLIC_APP_URL=https://menu.example.com`, a response is shaped like:

```json
{
  "url": "https://menu.example.com/r/ashas-kitchen/t/random-public-token",
  "imageDataUrl": "data:image/png;base64,..."
}
```

The QR contains only the public frontend route, restaurant slug, and random table token. It never contains authentication credentials or private restaurant data. Save the returned `imageDataUrl` as a PNG through an API client or browser tool, then print it with the table number. The frontend route can call the public resolver:

```http
GET /api/public/tables/:qrToken
```

This unauthenticated endpoint returns only the active restaurant name/slug and table label. Invalid tokens, inactive tables, and tables belonging to inactive restaurants return `404`.

## Ordering API

Guest order creation requires no authentication:

```http
POST /api/public/orders
Content-Type: application/json

{
  "tableQrToken": "random-public-table-token",
  "paymentMethod": "CASH",
  "customerName": "Sam",
  "items": [
    {
      "menuItemId": "item-uuid",
      "quantity": 2
    }
  ]
}
```

The server resolves the QR token to an active table and restaurant, revalidates every item against that restaurant’s current availability, calculates all subtotals and the total, and stores the item name and price snapshots. Client prices, subtotals, totals, restaurant IDs, and owner IDs are ignored because they are not accepted as trusted order fields.

Successful creation returns an unguessable tracking token:

```json
{
  "order": {
    "orderId": "order-uuid",
    "trackingToken": "random-order-tracking-token",
    "status": "PENDING",
    "paymentMethod": "CASH",
    "paymentStatus": "PAYMENT_DUE",
    "totalAmount": "25.00",
    "items": [
      {
        "itemName": "Paneer Tikka",
        "unitPrice": "12.50",
        "quantity": 2,
        "lineSubtotal": "25.00"
      }
    ]
  }
}
```

Use `GET /api/public/orders/:trackingToken` for customer tracking. The tracking token, not the order UUID, is the public bearer credential. The response excludes customer contact details and internal restaurant/table IDs.

Owner order endpoints require `Authorization: Bearer <token>` and verify restaurant ownership:

- `GET /api/restaurants/:restaurantId/orders?page=1&pageSize=20&status=PENDING` lists orders newest first with pagination and an optional status filter. `pageSize` is limited to 100.
- `GET /api/restaurants/:restaurantId/orders/:orderId` retrieves one order.
- `PATCH /api/restaurants/:restaurantId/orders/:orderId/status` changes status through the server state machine.
- `PATCH /api/restaurants/:restaurantId/orders/:orderId/eta` accepts `{ "estimatedReadyAt": "2026-01-01T12:00:00.000Z" }` or `{ "estimatedReadyAt": null }`.
- `PATCH /api/restaurants/:restaurantId/orders/:orderId/payment` records cash collection; it takes no client-supplied amount and cannot alter the order total.

Allowed status transitions are:

```text
PENDING → ACCEPTED | REJECTED | CANCELLED
ACCEPTED → PREPARING | CANCELLED
PREPARING → READY | CANCELLED
READY → COMPLETED
```

`REJECTED`, `CANCELLED`, and `COMPLETED` are terminal. `completedAt` is set only when an order enters `COMPLETED`; `estimatedReadyAt` remains a separate expected timestamp. Payment status is separate from order status: every new cash order starts as `PAYMENT_DUE`, and collection sets `paymentStatus=PAID` plus `paymentCollectedAt`. Duplicate collection returns `409`, and order-status changes never mark payment collected.

Order creation runs in a serializable Prisma transaction and retries serialization conflicts. Menu availability and prices are re-read inside that transaction; an unavailable or foreign item rejects the complete order, and item/order creation cannot partially commit. Status and payment writes use conditional `updateMany` predicates containing the previously observed status/payment state, so a concurrent dashboard request affects zero rows and returns `409` instead of silently overwriting the other update. This is optimistic compare-and-set protection; clients should refresh after a conflict.

The authentication, restaurant, menu, table, and order tests use in-memory Prisma-shaped repository mocks, so they cannot modify production or Supabase data. Apply migrations separately with `npx prisma migrate deploy`.

```sh
npm test
```

## Phase 8 frontend

The React/Vite frontend lives in `frontend/` and consumes the backend APIs through `VITE_API_BASE_URL`. It includes owner authentication, restaurant selection, menu/category management, table QR management, order operations, and public guest ordering with cash payment.

```sh
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL in .env, then:
npm run dev
```

Build and test the frontend with:

```sh
cd frontend
npm run build
npm test
```
