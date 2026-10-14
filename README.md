# Menu backend

Phase 2 provides User and Restaurant models, password-based authentication, JWT sessions, and server-side tenant ownership checks. Menu management, orders, payments, and staff membership are intentionally deferred.

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

   This creates the User and Restaurant tables and requires a reachable Supabase database. Never point test commands at production data.

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

## Tests

The authentication tests use an in-memory Prisma-shaped repository mock, so they cannot modify production or Supabase data. A real migration still requires configured Supabase credentials.

```sh
npm test
```
