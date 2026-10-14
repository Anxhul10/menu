# Menu backend

Phase 3 provides authenticated restaurant management. Users can own multiple restaurants, each restaurant has a unique generated slug, and deletion archives the record instead of destroying it. Menu management, orders, payments, tables, and staff membership are intentionally deferred.

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

   This applies the User and Restaurant tables. For an existing Phase 2 database, apply the Phase 3 profile migration with:

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

The authentication and restaurant tests use in-memory Prisma-shaped repository mocks, so they cannot modify production or Supabase data. A real migration still requires configured Supabase credentials.

```sh
npm test
```
