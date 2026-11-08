FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/* && npm i -g pnpm@9
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ddotsinvoice/db db:generate
RUN pnpm --filter "./packages/*" build
RUN pnpm --filter @ddotsinvoice/api build

FROM node:20-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
# Noto fonts (Arabic + Latin) for invoice PDFs; Chromium + its system libs for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends fonts-noto-core && rm -rf /var/lib/apt/lists/*
COPY --from=base /app ./
RUN cd apps/api && node_modules/.bin/playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*
EXPOSE 3001
CMD ["sh", "-c", "node packages/db/dist/migrate.js && node apps/api/dist/main.js"]
