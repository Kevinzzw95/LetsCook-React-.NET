FROM node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_MAIN_API_URL=/api/
ARG VITE_AI_API_URL=/ai/
ARG VITE_ENABLE_CRAWLER=false
ENV VITE_MAIN_API_URL=$VITE_MAIN_API_URL VITE_AI_API_URL=$VITE_AI_API_URL VITE_ENABLE_CRAWLER=$VITE_ENABLE_CRAWLER
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine@sha256:7377697a821c131a924a7105fafbe7414db4e9fcc77a6f08f776f33f141ec3f8 AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
