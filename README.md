# Menu backend

Phase 1 provides the Express foundation, health endpoint, centralized error handling, and Prisma/PostgreSQL configuration. Domain models and authentication are intentionally deferred to Phase 2.

## Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. In the Supabase dashboard, open **Project Settings → Database** and copy the pooler connection string into `DATABASE_URL`. Copy the direct connection string into `DIRECT_URL`. Replace the placeholders with the project reference, region, and database password; do not commit `.env`.
4. Install dependencies and generate the Prisma client:

   ```sh
   npm install
   npm run prisma:generate
   ```

5. Run the initial migration workflow after the Supabase values are configured:

   ```sh
   npx prisma migrate dev --name init
   ```

   Phase 1 has no domain models yet, so Prisma may report that there are no schema changes. The command still verifies the configured database connection and establishes the migration workflow for Phase 2.

## Run

```sh
npm run dev
```

The API is available at `http://localhost:3000`. Check it with `curl http://localhost:3000/api/health`.

## Tests

Tests do not require a live database because the health endpoint does not access Prisma:

```sh
npm test
```
