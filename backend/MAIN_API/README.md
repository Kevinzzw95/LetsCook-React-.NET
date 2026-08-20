# LetsCook NestJS Main API

This is the LetsCook main backend. It preserves the established HTTP routes, request payloads, response casing, and PostgreSQL schema.

## Run locally

```bash
npm install
npm run start:dev
```

The API listens on port `5000` by default. If another process occupies port 5000, set `PORT=5001` and update the frontend base URL.

Copy `.env.example` to `.env`. `DATABASE_URL` and `JWT_SECRET` are required; no retired-backend configuration fallback is used.

`REDIS_URL` is optional and must be a complete URI such as `redis://default:password@host:port/0` (or `rediss://...` when TLS is required). The NestJS Redis module connects on startup, closes cleanly on shutdown, and degrades gracefully when Redis is unavailable. Check it with `GET /api/redis/health`. Never commit the Redis password.

`DATABASE_URL` points to the existing `recipe` PostgreSQL database. Prisma maps the existing quoted table and column names directly. Do not run `prisma migrate` or `prisma db push` against an existing environment without an approved schema-migration plan. Generate the client after schema changes with `npm run prisma:generate`.

`Recipes.ImageInfo` uses PostgreSQL `jsonb`, and `Recipes.Diets` uses a non-null `text[]`. Both are Prisma-native fields, so recipe and meal-plan services use only generated Prisma Client query APIs.

## Authentication and compatibility

- Existing PBKDF2 password hashes in the current user database are accepted, and new registrations use the same stored hash format.
- JWTs use HS512, the configured `JWT_SECRET`, seven-day expiry, and `nameid`, `email`, `unique_name`, and `role` claims. `nameid` is the only accepted user-ID claim.
- Recipe create/update endpoints continue to accept `multipart/form-data` with JSON strings for `steps`, `ingredients`, `ingredientsEn`, `imageInfo`, and `existingImageUrls`.
- PostgreSQL `hstore`, `text[]`, relation names, and numeric fields use the existing database representation.

## Routes

| Method | Path |
|---|---|
| POST | `/api/account/login` |
| POST | `/api/account/refresh` |
| POST | `/api/account/register` |
| GET | `/api/account/currentUser` |
| PUT | `/api/account/profile` |
| GET, POST | `/api/recipe` |
| GET | `/api/recipe/search` |
| GET | `/api/recipe/facets` |
| GET, PUT, DELETE | `/api/recipe/:id` |
| GET, POST | `/api/shoppingList` |
| PUT | `/api/shoppingList/:itemId` |
| POST | `/api/shoppingList/meal-plan-days` |
| POST | `/api/shoppingList/recipe/:recipeId` |
| GET, POST | `/api/mealPlan` |
| DELETE | `/api/mealPlan/:id` |
| GET | `/api/redis/health` |

## Verification

```bash
npm run prisma:validate
npm run prisma:generate
npm test
npm run build
```

The service was also exercised against the existing PostgreSQL database with a disposable full write cycle. All temporary records were removed after verification.
