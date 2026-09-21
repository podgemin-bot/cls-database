# syntax=docker/dockerfile:1

# ---------- deps ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- builder ----------
FROM node:24-alpine AS builder
WORKDIR /app
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- runner ----------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# standalone server (node_modules/ server/ public/ are baked in)
COPY --from=builder /app/.next/standalone ./
# static assets are NOT auto-copied by next build for standalone
COPY --from=builder /app/.next/static ./.next/static
# runtime files (floor plans / uploaded photos) — mount a volume here in prod
COPY --from=builder /app/public ./public
# prisma CLI + engines + schema so the entrypoint can run migrations at boot
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]