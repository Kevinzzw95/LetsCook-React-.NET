# LetsCook with Docker

Docker Desktop (or Docker Engine with Compose v2) is the only host runtime required.
The default stack is core-only: React/Nginx, NestJS, FastAPI, and PostgreSQL 16 with pgvector.
Cloudinary, OpenAI, Gemini, Tavily, and USDA remain external services. Redis is optional and disabled.

## First run (empty database)

1. Copy `.env.docker.example` to `.env.docker` if the latter does not already exist.
2. Set a random `POSTGRES_PASSWORD` and a different, long `JWT_SECRET`. Use URL-safe hex values
   (`openssl rand -hex 24` and `openssl rand -hex 48`). The database name/user must also be URL-safe.
3. Add provider credentials for the features you use: OpenAI for chat/RAG, Gemini for image recipe
   extraction, Cloudinary for uploads, Tavily for web search, USDA for nutrition lookup.
   Missing keys do not prevent startup; affected requests fail explicitly.
4. From the repository root:

```sh
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d db
docker compose --env-file .env.docker run --rm migrate
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker ps
```

Open http://localhost:3000. The initial build downloads dependencies and can take several minutes.
`up -d` also runs the idempotent migration service automatically before either API starts.
Use `config --quiet`, not plain `config`, when sharing output: expanded configuration contains secrets.

Only the frontend is published, bound to loopback. `/api/` preserves the NestJS prefix; `/ai/`
strips the proxy prefix before calling FastAPI. API/database service names resolve only inside Docker.
Nginx resolves API addresses dynamically so recreation of an API container does not require rebuilding the frontend.

## Import an existing database

Always restore into a NEW Docker volume/database; never overwrite your source database.
Check the source major version first. The default image is PostgreSQL 16. Use a compatible pgvector
image if your source is newer; do not restore a newer database into an older PostgreSQL major.

1. Stop source writes for the final copy. Export with `pg_dump --format=custom --no-owner --no-acl`
   using a client at least as new as the source server. The export contains private application data.
2. Build the images and start **only** `db` as above. Do not run `migrate` before the restore.
3. Restore the custom-format archive (replace the filename):

```sh
docker compose --env-file .env.docker exec -T db sh -c \
  'pg_restore --exit-on-error --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < letscook.dump
```

4. Set `BASELINE_RESTORED=true` in `.env.docker` and run `migrate`.
   The migration runner validates application columns and primary/unique/foreign keys against a
   temporary baseline schema before recording it. Historical constraint names may differ, but their
   semantics must match. Extra legacy tables/columns are left intact. Schema mismatches fail closed
   with a list of differences; reconcile these on the restored copy and repeat. Do not blindly mark
   migrations applied or run `prisma db push` on imported data.
5. Reset `BASELINE_RESTORED=false`, compare table counts/ownership/sequence values, and start the APIs.
6. Verify migrated-user login, saved recipes, meal dates, and image references before switching users over.

The baseline precedes the existing hstore-to-JSONB migration without changing that migration's checksum.
Restored databases already using JSONB are validated and have that conversion marked applied.
The default registration role (ID `1`, User), AI tables/extensions, and the configured vector collection
are provisioned by the migration runner. Imported role records are preserved.
Existing vector dimensions must match `OPENAI_EMBEDDING_DIMENSIONS`; mismatches stop initialization.
Keep the existing embedding model/dimensions when importing vectors. A model change requires deliberate re-embedding.

## Checks and troubleshooting

```sh
docker compose --env-file .env.docker logs --tail=100 migrate main-api ai-api frontend
curl --fail http://localhost:3000/api/ready
curl --fail http://localhost:3000/ai/api/ready
curl --fail http://localhost:3000/recipe-list
```

Run the included API smoke check through Nginx (creates a clearly named test user, recipe, and meal):

```sh
docker compose --env-file .env.docker exec -T ai-api python - < scripts/docker_smoke.py
```

The script also tests shared JWTs, refresh, conversations, ownership filtering, recipe editing,
meal-plan persistence, disabled crawling, and missing-provider failure behavior without paid API calls.
Run it again after a restart with the same `SMOKE_USER` to verify persisted records:

```sh
docker compose --env-file .env.docker down
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker exec -T ai-api python - < scripts/docker_smoke.py
```

`down` preserves `postgres_data`. **`down -v` deletes the database volume.** Back up before using it.
Do not point smoke tests at production; they create fixtures. API credentials remain in the container environment.

Provider-dependent acceptance checks must be run with valid keys: image extraction/upload, semantic
search, and the Chinese tomorrow-lunch/dinner request. Verify only owned chicken/pork recipes are
selected and the calendar refreshes. Check database rollback and concurrent duplicate-save tests too.

The core FastAPI unit suite is:

```sh
cd backend/AI_API
uv sync --locked --group dev
ENABLE_CRAWLER=false uv run --locked pytest tests/test_auth.py tests/test_chat_auth.py \
  tests/test_chat_tool_node.py tests/test_internal_recipe_rag.py tests/test_meal_planning.py \
  tests/test_meal_plan_saving.py tests/test_web_search.py tests/test_container_runtime.py
```

Legacy browser/store tests require `uv sync --locked --extra crawler --group dev` and their external
services/browser setup. They are not core container startup checks.

## Configuration and behavior

- Frontend URLs default to localhost for direct Vite development. Docker builds use `/api/` and `/ai/`.
  `VITE_*` settings are public build arguments, not runtime secrets. Rebuild the frontend to change them.
- The core Docker image always disables crawling. Enabling only an environment flag cannot install
  missing browser dependencies; a crawler-specific image/worker is a separate deployment.
- `AUTO_CREATE_SCHEMA=false` disables request-time schema creation in the AI API. Run migrations first.
- Recipe embeddings still update on retrieval, protected by a cross-process PostgreSQL lock.
  Initial synchronization may require time and provider usage; consider a dedicated job when scaling.
- Liveness is `/api/health`; readiness is `/api/ready` on each API. Missing AI-provider keys are not
  database-readiness failures. Health checks do not send paid AI requests.
- Requests have a 20 MiB proxy upload limit. Chat execution times out at 180 seconds; image-generation
  provider calls time out at 120 seconds. A timed-out meal save may already have committed: check the calendar before retrying.
- Production CORS allows only configured `FRONTEND_ORIGINS` / `CORS_ORIGINS`; local browser traffic
  through Nginx is same-origin. The APIs use the same `JWT_SECRET`.
- Named volumes hold database data; application containers do not store uploaded images locally.
- Logs rotate at 10 MiB with three files per service. No source bind mounts are used.

## Release images

After testing, build for the target architecture with `docker buildx build --platform linux/amd64`
(or `linux/arm64`), tag each image with the Git commit SHA, and push to your chosen registry.
Build the main API's `runtime` and `migration` targets separately. Record image digests in deployment configuration.
Do not bake `.env.docker` or provider keys into images. Use platform secret injection, managed PostgreSQL,
and platform TLS termination for cloud production. Review the base-image digests when updating dependencies.
The frontend's Docker-DNS proxy configuration is for Compose; cloud deployments should supply public
API build URLs or a platform-specific proxy configuration.

## Verified in this checkout (2026-10-18)

- All four build targets (frontend, main runtime, migration, AI runtime) build successfully on Linux amd64.
- Full frontend TypeScript/Vite build passes. Existing missing decorative-asset and bundle-size warnings remain.
- 89 core Python tests, 16 NestJS tests, and 7 frontend chat tests pass.
- Fresh schema initialization, repeat initialization, restored JSONB schema baselining, and rejection
  of an incompatible restored schema were exercised against disposable PostgreSQL databases.
- HTTP smoke checks pass through Nginx, including shared JWT authentication/refresh, recipe edits,
  conversation ownership, missing OpenAI-key handling, concurrent saves, rollback, and pgvector
  storage/filtering with local deterministic embeddings.
- The same checks pass after `down` / `up`, confirming volume persistence.
- Browser login, authenticated route refreshes, and the disabled crawler UI pass without JavaScript exceptions.

Live AI generation, external image uploads, and provider-generated semantic rankings require your
credentials and were not exercised. Existing npm dependency audit findings are not resolved by
containerization; review them before public deployment. No cloud deployment or registry push was performed.
