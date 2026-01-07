FROM node:20-alpine AS base

# 1. Зависимости
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Сборка
FROM base AS builder
WORKDIR /app

# 👇 Принимаем все необходимые build arguments
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_API_URL
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_PRIVATE_KEY
ARG FIREBASE_DATABASE_URL
ARG GITHUB_ID
ARG GITHUB_SECRET
ARG GITHUB_ACCESS_TOKEN
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEXTAUTH_SECRET

# 👇 Устанавливаем их как ENV для Next.js
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
ENV FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
ENV FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY
ENV FIREBASE_DATABASE_URL=$FIREBASE_DATABASE_URL
ENV GITHUB_ID=$GITHUB_ID
ENV GITHUB_SECRET=$GITHUB_SECRET
ENV GITHUB_ACCESS_TOKEN=$GITHUB_ACCESS_TOKEN
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
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
# Исправлено: копируем standalone из правильного места
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
