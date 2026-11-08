FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ && npm i -g pnpm@9
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_STANDALONE=1
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "./packages/*" build
RUN pnpm --filter @ddotsinvoice/super-admin build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/apps/super-admin/.next/standalone ./
COPY --from=builder /app/apps/super-admin/.next/static ./apps/super-admin/.next/static
COPY --from=builder /app/apps/super-admin/public ./apps/super-admin/public
EXPOSE 3000
CMD ["node", "apps/super-admin/server.js"]
