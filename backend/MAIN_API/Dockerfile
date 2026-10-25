FROM node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM build AS migration
COPY scripts ./scripts
USER node
CMD ["node", "scripts/migrate.cjs"]

FROM build AS production-dependencies
RUN npm prune --omit=dev --ignore-scripts

FROM base AS runtime
ENV NODE_ENV=production PORT=5001
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 5001
CMD ["node", "dist/main.js"]
