FROM node:20-alpine AS base

# 1. Зависимости
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Сборка
FROM base AS builder
WORKDIR /app

# 👇 Принимаем build arguments
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_API_URL

# 👇 Устанавливаем как ENV для Next.js
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Сборка с обработкой ошибок
RUN npm run build 2>&1 | tee /tmp/build.log || \
    (echo "Build failed:" && cat /tmp/build.log && exit 1)

# 3. Запуск
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]