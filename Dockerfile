FROM node:20-alpine AS base

# Install dependencies only when needed
# Database schema synced: 2025-12-02
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files AND prisma schema (needed for postinstall)
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (already done in deps, but ensure it's there)
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY start.sh ./start.sh

RUN chmod +x start.sh

USER nextjs

EXPOSE 8080

CMD ["./start.sh"]
